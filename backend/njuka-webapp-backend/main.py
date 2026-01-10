from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from typing import List, Dict, Optional, Set
import uuid
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

suits = ['♠', '♥', '♦', '♣']
values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

class Card(BaseModel):
    value: str
    suit: str

class Player(BaseModel):
    name: str
    hand: List[Card]
    is_cpu: bool = False
    wallet: int = 10000

class GameState(BaseModel):
    deck: List[Card]
    pot: List[Card]
    players: List[Player]
    current_player: int
    has_drawn: bool
    id: str
    mode: str
    max_players: int
    entry_fee: int = 0
    pot_amount: int = 0
    winner: str = ""
    winner_hand: List[Card] = []
    game_over: bool = False

class LobbyGame(BaseModel):
    id: str
    host: str
    players: List[str]
    max_players: int
    created_at: datetime
    started: bool = False
    last_updated: datetime
    game_id: Optional[str] = None
    entry_fee: int = 0

    class Config:
        json_encoders = {datetime: lambda dt: dt.isoformat()}

    def dict(self, **kwargs):
        data = super().dict(**kwargs)
        data["created_at"] = self.created_at.isoformat()
        data["last_updated"] = self.last_updated.isoformat()
        return data


app = FastAPI(debug=True)

# CORS - Relaxed for development and cross-device testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={"Access-Control-Allow-Origin": "*"}
    )

active_games: Dict[str, GameState] = {}
active_lobbies: Dict[str, LobbyGame] = {}
player_wallets: Dict[str, int] = {}

def get_player_wallet(name: str) -> int:
    if name not in player_wallets:
        player_wallets[name] = 10000
    return player_wallets[name]

class ConnectionManager:
    def __init__(self):
        self.game_connections: Dict[str, Dict[str, WebSocket]] = {}
        self.lobby_connections: Dict[str, Set[WebSocket]] = {}

    async def connect_to_game(self, ws: WebSocket, game_id: str, player_name: str):
        try:
            await ws.accept()
            if game_id not in self.game_connections:
                self.game_connections[game_id] = {}
            self.game_connections[game_id][player_name] = ws
            logger.info(f"Player {player_name} connected to game {game_id}")
        except Exception as e:
            logger.error(f"Failed to connect player {player_name} to game {game_id}: {e}")

    async def connect_to_lobby(self, ws: WebSocket, lobby_id: str):
        try:
            await ws.accept()
            if lobby_id not in self.lobby_connections:
                self.lobby_connections[lobby_id] = set()
            self.lobby_connections[lobby_id].add(ws)
            logger.info(f"Client connected to lobby {lobby_id}")
        except Exception as e:
            logger.error(f"Failed to connect client to lobby {lobby_id}: {e}")

    def disconnect_from_game(self, game_id: str, player_name: str):
        if game_id in self.game_connections and player_name in self.game_connections[game_id]:
            del self.game_connections[game_id][player_name]
            if not self.game_connections[game_id]:
                del self.game_connections[game_id]

    def disconnect_from_lobby(self, ws: WebSocket, lobby_id: str):
        if lobby_id in self.lobby_connections:
            self.lobby_connections[lobby_id].discard(ws)
            if not self.lobby_connections[lobby_id]:
                del self.lobby_connections[lobby_id]

    async def broadcast_game_update(self, game_id: str, game_state: GameState):
        if game_id not in self.game_connections:
            return
        message = json.dumps({"type": "game_update", "data": game_state.dict()})
        disconnected = []
        for player_name, ws in self.game_connections[game_id].items():
            try:
                await ws.send_text(message)
            except:
                disconnected.append(player_name)
        for pn in disconnected:
            self.disconnect_from_game(game_id, pn)

    async def broadcast_lobby_update(self, lobby_id: str, lobby: LobbyGame):
        if lobby_id not in self.lobby_connections:
            return
        message = json.dumps({"type": "lobby_update", "data": lobby.dict()})
        disconnected = []
        for ws in self.lobby_connections[lobby_id]:
            try:
                await ws.send_text(message)
            except:
                disconnected.append(ws)
        for ws in disconnected:
            self.disconnect_from_lobby(ws, lobby_id)

manager = ConnectionManager()

def create_deck() -> List[Card]:
    return [Card(value=v, suit=s) for s in suits for v in values]

def new_game_state(mode: str, player_name: str, cpu_count: int = 1, max_players: int = 4, entry_fee: int = 0, deduct_fee: bool = True) -> GameState:
    deck = create_deck()
    random.shuffle(deck)
    players = []

    wallet = get_player_wallet(player_name)
    if wallet < entry_fee:
        raise HTTPException(status_code=400, detail=f"Insufficient funds. Required: K{entry_fee}, Available: K{wallet}")

    if deduct_fee:
        player_wallets[player_name] -= entry_fee
    players.append(Player(name=player_name, hand=[], wallet=player_wallets[player_name]))

    if mode == "cpu":
        for i in range(cpu_count):
            players.append(Player(name=f"CPU {i+1}", hand=[], is_cpu=True, wallet=10000))
    
    pot_amount = entry_fee * len(players)

    # Deal 3 cards to each player
    for _ in range(3):
        for player in players:
            if deck:
                player.hand.append(deck.pop())

    starting_player = random.randint(0, len(players) - 1)

    return GameState(
        deck=deck,
        pot=[],
        players=players,
        current_player=starting_player,
        has_drawn=False,
        id=str(uuid.uuid4()),
        mode=mode,
        max_players=max_players,
        entry_fee=entry_fee,
        pot_amount=pot_amount
    )

# ====================== REQUEST MODELS ======================
class CreateLobbyRequest(BaseModel):
    host: str
    max_players: int = 4
    entry_fee: int = 100

class JoinLobbyRequest(BaseModel):
    player: str

# ====================== ROUTES ======================

@app.post("/lobby/create")
async def create_lobby(request: CreateLobbyRequest):
    if not (2 <= request.max_players <= 8):
        raise HTTPException(status_code=400, detail="Max players must be 2-8")

    wallet = get_player_wallet(request.host)
    if wallet < request.entry_fee:
        raise HTTPException(status_code=400, detail=f"Insufficient funds. Required: K{request.entry_fee}, Available: K{wallet}")

    lobby_id = str(uuid.uuid4())
    lobby = LobbyGame(
        id=lobby_id,
        host=request.host,
        players=[request.host],
        max_players=request.max_players,
        created_at=datetime.now(),
        last_updated=datetime.now(),
        entry_fee=request.entry_fee
    )
    player_wallets[request.host] -= request.entry_fee
    active_lobbies[lobby_id] = lobby
    logger.info(f"Lobby created: {lobby_id} by {request.host} with fee K{request.entry_fee}")
    return lobby.dict()

@app.post("/lobby/{lobby_id}/join")
async def join_lobby(lobby_id: str, request: JoinLobbyRequest):
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")

    lobby = active_lobbies[lobby_id]
    player_name = request.player

    if len(lobby.players) >= lobby.max_players:
        raise HTTPException(status_code=400, detail="Lobby is full")

    if player_name in lobby.players:
        raise HTTPException(status_code=400, detail="Player already in lobby")

    wallet = get_player_wallet(player_name)
    logger.info(f"Player {player_name} attempting to join lobby {lobby_id}. Wallet: K{wallet}, Fee: K{lobby.entry_fee}")
    
    if wallet < lobby.entry_fee:
        logger.warning(f"Join failed: Insufficient funds for {player_name}. Need K{lobby.entry_fee}, have K{wallet}")
        raise HTTPException(status_code=400, detail=f"Insufficient funds. Required: K{lobby.entry_fee}, Available: K{wallet}")

    player_wallets[player_name] -= lobby.entry_fee

    # CRITICAL FIX: Create game when second player joins
    if len(lobby.players) == 1:  # This is the second player → start the game!
        # Host fee was already deducted in create_lobby, so pass deduct_fee=False
        game_state = new_game_state("multiplayer", lobby.host, max_players=lobby.max_players, entry_fee=lobby.entry_fee, deduct_fee=False)
        active_games[game_state.id] = game_state
        # Note: new_game_state already deducted host fee and added host to players
        # But wait, new_game_state for multiplayer needs adjustment to not double-deduct host fee 
        # and to handle players list correctly.

        # Add joining player to the game with 3 cards
        game_state.players.append(Player(name=player_name, hand=[], wallet=player_wallets[player_name]))
        game_state.pot_amount += lobby.entry_fee
        for _ in range(3):
            if game_state.deck:
                game_state.players[-1].hand.append(game_state.deck.pop())

        # THIS WAS THE MISSING LINE THAT BROKE EVERYTHING
        lobby.game_id = game_state.id
        lobby.started = True
        logger.info(f"Game {game_state.id} created for lobby {lobby_id}")

    # Now add player to lobby list
    lobby.players.append(player_name)
    lobby.last_updated = datetime.now()

    # Notify everyone (host will now see game_id and switch screen)
    await manager.broadcast_lobby_update(lobby_id, lobby)

    # Return updated lobby + full game state
    game = active_games.get(lobby.game_id) if lobby.game_id else None

    return JSONResponse(content={
        "lobby": lobby.dict(),
        "game": game.dict() if game else None
    })

@app.get("/lobby/list")
async def list_lobbies():
    now = datetime.now()
    expired = []
    for lid, lobby in active_lobbies.items():
        if lobby.started:
            if (now - lobby.last_updated) > timedelta(minutes=10):
                expired.append(lid)
        elif (now - lobby.last_updated) > timedelta(minutes=30):
            expired.append(lid)
    for lid in expired:
        if lid in active_lobbies:
            del active_lobbies[lid]
    return list(active_lobbies.values())

@app.post("/new_game")
async def create_cpu_game(player_name: str = "Player", cpu_count: int = 1, entry_fee: int = 0, mode: str = "cpu", max_players: int = 4):
    game = new_game_state(mode, player_name, cpu_count=cpu_count, entry_fee=entry_fee, max_players=max_players)
    active_games[game.id] = game
    return game.dict()

@app.get("/game/{game_id}")
async def get_game(game_id: str):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    return active_games[game_id].dict()

@app.post("/game/{game_id}/draw")
async def draw_card(game_id: str):
    game = active_games.get(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if not game.deck:
        raise HTTPException(status_code=400, detail="Deck empty")
    if game.has_drawn:
        raise HTTPException(status_code=400, detail="Already drawn")

    card = game.deck.pop()
    game.players[game.current_player].hand.append(card)
    game.has_drawn = True

    winner, hand = check_any_player_win(game.players, game.pot)
    if winner:
        game.winner = winner
        game.winner_hand = hand
        game.game_over = True
        # Credit pot to winner
        player_wallets[winner] += game.pot_amount
        for p in game.players:
            if p.name == winner:
                p.wallet = player_wallets[winner]

    await manager.broadcast_game_update(game_id, game)
    return game.dict()

@app.post("/game/{game_id}/discard")
async def discard_card(game_id: str, card_index: int = Query(...)):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")

    game = active_games[game_id]
    player = game.players[game.current_player]

    if not game.has_drawn:
        raise HTTPException(status_code=400, detail="Must draw first")
    if not (0 <= card_index < len(player.hand)):
        raise HTTPException(status_code=400, detail="Invalid card")

    card = player.hand.pop(card_index)
    game.pot.append(card)
    game.has_drawn = False

    winner, hand = check_any_player_win(game.players, game.pot)
    if winner:
        game.winner = winner
        game.winner_hand = hand
        game.game_over = True
        # Credit pot to winner
        player_wallets[winner] += game.pot_amount
        for p in game.players:
            if p.name == winner:
                p.wallet = player_wallets[winner]
    else:
        game.current_player = (game.current_player + 1) % len(game.players)

    await manager.broadcast_game_update(game_id, game)
    return game.dict()

@app.get("/")
async def root():
    return {"message": "Njuka King backend is live & fixed! 🔥"}

@app.get("/heartbeat")
async def heartbeat():
    return {"status": "ok"}

@app.get("/wallet/{player_name}")
async def get_wallet(player_name: str):
    return {"wallet": get_player_wallet(player_name)}

# WebSocket Endpoints
@app.websocket("/ws/game/{game_id}")
async def ws_game(websocket: WebSocket, game_id: str, player_name: str = Query(...)):
    if game_id not in active_games:
        await websocket.close(code=1008)
        return
    await manager.connect_to_game(websocket, game_id, player_name)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect_from_game(game_id, player_name)
    except:
        manager.disconnect_from_game(game_id, player_name)

@app.websocket("/ws/lobby/{lobby_id}")
async def ws_lobby(websocket: WebSocket, lobby_id: str):
    if lobby_id not in active_lobbies:
        await websocket.close(code=1008)
        return
    await manager.connect_to_lobby(websocket, lobby_id)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    except WebSocketDisconnect:
        manager.disconnect_from_lobby(websocket, lobby_id)
    except:
        manager.disconnect_from_lobby(websocket, lobby_id)

# Win condition logic
def card_value_index(card):
    return values.index(card.value) + 1

def is_winning_combination(cards: List[Card]) -> bool:
    if len(cards) not in (3, 4):
        return False
    vals = [card_value_index(c) for c in cards]
    count = {}
    for v in vals:
        count[v] = count.get(v, 0) + 1
    pairs = sum(1 for c in count.values() if c == 2)
    if pairs != 1:
        return False
    pair_val = [k for k, v in count.items() if v == 2][0]
    others = sorted([v for v in vals if v != pair_val])
    if len(others) != 2:
        return False
    if others == [1, 13]:  # A + K
        return True
    return others[1] - others[0] == 1

def check_any_player_win(players, pot):
    top = pot[-1] if pot else None
    for p in players:
        if len(p.hand) == 4 and is_winning_combination(p.hand):
            return p.name, p.hand
        if top and len(p.hand) == 3:
            test = p.hand + [top]
            if is_winning_combination(test):
                return p.name, test
    return None, None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
