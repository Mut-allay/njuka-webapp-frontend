from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random
from typing import List, Dict, Optional, Set
import uuid
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta
import logging
import json
import asyncio

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

class GameState(BaseModel):
    deck: List[Card]
    pot: List[Card]
    players: List[Player]
    current_player: int
    has_drawn: bool
    id: str
    mode: str
    max_players: int
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

    class Config:
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

    def dict(self, **kwargs):
        data = super().dict(**kwargs)
        data["created_at"] = self.created_at.isoformat()
        data["last_updated"] = self.last_updated.isoformat()
        return data

app = FastAPI()

# Configure CORS
origins = [
    "https://njuka-webapp-frontend.vercel.app",
    "https://njuka.vercel.app",
    "https://njuka-king.web.app",  # Firebase hosting domain
    "http://localhost:3000",
    "http://localhost:5173"
]

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add explicit CORS headers for all routes
@app.middleware("http")
async def add_cors_headers(request, call_next):
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "false"
    return response

active_games: Dict[str, GameState] = {}
active_lobbies: Dict[str, LobbyGame] = {}

# WebSocket connection management
class ConnectionManager:
    def __init__(self):
        # Store connections by game_id and player_name
        self.game_connections: Dict[str, Dict[str, WebSocket]] = {}
        # Store lobby connections
        self.lobby_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect_to_game(self, websocket: WebSocket, game_id: str, player_name: str):
        await websocket.accept()
        if game_id not in self.game_connections:
            self.game_connections[game_id] = {}
        self.game_connections[game_id][player_name] = websocket
        logger.info(f"Player {player_name} connected to game {game_id}")
    
    async def connect_to_lobby(self, websocket: WebSocket, lobby_id: str):
        await websocket.accept()
        if lobby_id not in self.lobby_connections:
            self.lobby_connections[lobby_id] = set()
        self.lobby_connections[lobby_id].add(websocket)
        logger.info(f"Client connected to lobby {lobby_id}")
    
    def disconnect_from_game(self, game_id: str, player_name: str):
        if game_id in self.game_connections and player_name in self.game_connections[game_id]:
            del self.game_connections[game_id][player_name]
            if not self.game_connections[game_id]:
                del self.game_connections[game_id]
        logger.info(f"Player {player_name} disconnected from game {game_id}")
    
    def disconnect_from_lobby(self, websocket: WebSocket, lobby_id: str):
        if lobby_id in self.lobby_connections:
            self.lobby_connections[lobby_id].discard(websocket)
            if not self.lobby_connections[lobby_id]:
                del self.lobby_connections[lobby_id]
        logger.info(f"Client disconnected from lobby {lobby_id}")
    
    async def broadcast_game_update(self, game_id: str, game_state: GameState):
        if game_id in self.game_connections:
            message = {
                "type": "game_update",
                "data": game_state.dict()
            }
            disconnected = []
            for player_name, websocket in self.game_connections[game_id].items():
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    disconnected.append(player_name)
            
            # Clean up disconnected connections
            for player_name in disconnected:
                self.disconnect_from_game(game_id, player_name)
    
    async def broadcast_lobby_update(self, lobby_id: str, lobby: LobbyGame):
        if lobby_id in self.lobby_connections:
            message = {
                "type": "lobby_update",
                "data": lobby.dict()
            }
            disconnected = []
            for websocket in self.lobby_connections[lobby_id]:
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    disconnected.append(websocket)
            
            # Clean up disconnected connections
            for websocket in disconnected:
                self.disconnect_from_lobby(websocket, lobby_id)

manager = ConnectionManager()

def create_deck() -> List[Card]:
    return [Card(value=v, suit=s) for s in suits for v in values]

def new_game_state(mode: str, player_name: str, cpu_count: int = 1, max_players: int = 4) -> GameState:
    deck = create_deck()
    random.shuffle(deck)
    players = []
    if mode == "cpu":
        players.append(Player(name=player_name, hand=[]))
        for i in range(cpu_count):
            players.append(Player(name=f"CPU {i+1}", hand=[], is_cpu=True))
    else:
        players.append(Player(name=player_name, hand=[]))
    
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
        max_players=max_players
    )

@app.post("/lobby/create")
async def create_lobby(
    host_name: str = Query(...),
    max_players: int = Query(4)
):
    if max_players < 2 or max_players > 8:
        raise HTTPException(status_code=400, detail="Max players must be 2-8")
    
    lobby_id = str(uuid.uuid4())
    lobby = LobbyGame(
        id=lobby_id,
        host=host_name,
        players=[host_name],
        max_players=max_players,
        created_at=datetime.now(),
        last_updated=datetime.now()
    )
    active_lobbies[lobby_id] = lobby
    logger.info(f"Created lobby {lobby_id} for host {host_name}")
    return JSONResponse(content=lobby.dict())

@app.get("/lobby/list")
async def list_lobbies():
    current_time = datetime.now()
    expired = []
    for lobby_id, lobby in active_lobbies.items():
        if not lobby.started and (current_time - lobby.last_updated) > timedelta(minutes=30):
            expired.append(lobby_id)
        elif lobby.started and (current_time - lobby.last_updated) > timedelta(minutes=5):
            expired.append(lobby_id)
    for lobby_id in expired:
        del active_lobbies[lobby_id]
    
    lobbies = [
        {
            "id": lobby.id,
            "host": lobby.host,
            "players": lobby.players,
            "player_count": len(lobby.players),
            "max_players": lobby.max_players,
            "created_at": lobby.created_at.isoformat(),
            "started": lobby.started
        }
        for lobby in active_lobbies.values() if not lobby.started
    ]
    return JSONResponse(content={"lobbies": lobbies})

@app.get("/lobby/{lobby_id}")
async def get_lobby_details(lobby_id: str):
    """
    Fetches the current state of a specific lobby.
    """
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")
    
    lobby = active_lobbies[lobby_id]
    lobby.last_updated = datetime.now()
    return JSONResponse(content=lobby.dict())

@app.post("/lobby/join")
async def join_lobby(
    lobby_id: str = Query(...),
    player_name: str = Query(...)
):
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")
    
    lobby = active_lobbies[lobby_id]
    if lobby.started:
        raise HTTPException(status_code=400, detail="Game already started")
    if len(lobby.players) >= lobby.max_players:
        raise HTTPException(status_code=400, detail="Lobby is full")
    if player_name in lobby.players:
        raise HTTPException(status_code=400, detail="Name already taken")
    
    lobby.players.append(player_name)
    lobby.last_updated = datetime.now()
    
    # Broadcast update to all connected lobby clients
    await manager.broadcast_lobby_update(lobby_id, lobby)
    
    return JSONResponse(content=lobby.dict())

@app.post("/lobby/start")
async def start_lobby_game(
    lobby_id: str = Query(...),
    host_name: str = Query(...)
):
    if lobby_id not in active_lobbies:
        raise HTTPException(status_code=404, detail="Lobby not found")
    
    lobby = active_lobbies[lobby_id]
    if lobby.host != host_name:
        raise HTTPException(status_code=403, detail="Only the host can start the game")
    if len(lobby.players) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 players to start")

    game_state = new_game_state("multiplayer", lobby.players[0], max_players=lobby.max_players)
    for player_name in lobby.players[1:]:
        game_state.players.append(Player(name=player_name, hand=[]))
        for _ in range(3):
            if game_state.deck:
                game_state.players[-1].hand.append(game_state.deck.pop())
    
    lobby.started = True
    lobby.game_id = game_state.id
    lobby.last_updated = datetime.now()
    active_games[game_state.id] = game_state
    
    return JSONResponse(content=game_state.dict())

@app.post("/new_game")
async def create_game(
    mode: str = Query("cpu"),
    player_name: str = Query("Player"),
    cpu_count: int = Query(1),
    max_players: int = Query(4)
):
    if mode == "cpu":
        if cpu_count < 1 or cpu_count > 4:
            raise HTTPException(status_code=400, detail="CPU count must be 1-4")
    else:
        if max_players < 2 or max_players > 8:
            raise HTTPException(status_code=400, detail="Max players must be 2-8")
    
    game_state = new_game_state(mode, player_name, cpu_count, max_players)
    active_games[game_state.id] = game_state
    return JSONResponse(content=game_state.dict())

def randomize_starting_player_if_needed(game: GameState):
    if game.mode in ["multiplayer", "multi"] and len(game.players) >= 2:
        if not game.has_drawn and len(game.pot) == 0:
            game.current_player = random.randint(0, len(game.players) - 1)

@app.post("/join_game")
async def join_game(
    game_id: str = Query(...),
    player_name: str = Query("Player")
):
    if not game_id or game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = active_games[game_id]
    if any(p.name == player_name for p in game.players):
        return JSONResponse(content=game.dict())
    
    if len(game.players) >= game.max_players:
        raise HTTPException(status_code=400, detail="Game is full")
    
    game.players.append(Player(name=player_name, hand=[]))
    for _ in range(3):
        if game.deck:
            game.players[-1].hand.append(game.deck.pop())
    
    randomize_starting_player_if_needed(game)
    
    return JSONResponse(content=game.dict())

@app.get("/game/{game_id}")
async def get_game(game_id: str):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    return JSONResponse(content=active_games[game_id].dict())

@app.post("/game/{game_id}/draw")
async def draw_card(game_id: str):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = active_games[game_id]
    if not game.deck:
        raise HTTPException(status_code=400, detail="No cards left")
    if game.has_drawn:
        raise HTTPException(status_code=400, detail="You must discard before drawing again")
    
    card = game.deck.pop()
    game.players[game.current_player].hand.append(card)
    game.has_drawn = True

    winner, winner_hand = check_any_player_win(game.players, game.pot)
    if winner:
        game.winner = winner
        game.winner_hand = winner_hand
        game.game_over = True

    # Broadcast update to all connected players
    await manager.broadcast_game_update(game_id, game)

    return JSONResponse(content=game.dict())

@app.post("/game/{game_id}/discard")
async def discard_card(game_id: str, card_index: int = Query(...)):
    if game_id not in active_games:
        raise HTTPException(status_code=404, detail="Game not found")
    
    game = active_games[game_id]
    player = game.players[game.current_player]
    
    if not game.has_drawn:
        raise HTTPException(status_code=400, detail="You must draw before discarding")
    if card_index < 0 or card_index >= len(player.hand):
        raise HTTPException(status_code=400, detail="Invalid card index")
    
    card = player.hand.pop(card_index)
    game.pot.append(card)
    game.has_drawn = False

    winner, winner_hand = check_any_player_win(game.players, game.pot)
    if winner:
        game.winner = winner
        game.winner_hand = winner_hand
        game.game_over = True

    if not getattr(game, "game_over", False):
        game.current_player = (game.current_player + 1) % len(game.players)
    
    # Broadcast update to all connected players
    await manager.broadcast_game_update(game_id, game)
    
    return JSONResponse(content=game.dict())

@app.get("/")
async def root():
    return {"message": "Njuka backend is live!"}

@app.get("/healthcheck")
async def healthcheck():
    return {
        "status": "OK",
        "endpoints": {
            "new_game": "POST /new_game",
            "join_game": "POST /join_game",
            "get_game": "GET /game/{id}",
            "draw": "POST /game/{id}/draw",
            "discard": "POST /game/{id}/discard"
        }
    }

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    return {"message": "OK"}

@app.get("/health")
async def health():
    return {"status": "ok"}

# WebSocket endpoints
@app.websocket("/ws/game/{game_id}")
async def websocket_game_endpoint(websocket: WebSocket, game_id: str, player_name: str = Query(...)):
    if game_id not in active_games:
        await websocket.close(code=1008, reason="Game not found")
        return
    
    await manager.connect_to_game(websocket, game_id, player_name)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif message.get("type") == "get_game_state":
                game_state = active_games[game_id]
                await websocket.send_text(json.dumps({
                    "type": "game_state",
                    "data": game_state.dict()
                }))
    except WebSocketDisconnect:
        manager.disconnect_from_game(game_id, player_name)

@app.websocket("/ws/lobby/{lobby_id}")
async def websocket_lobby_endpoint(websocket: WebSocket, lobby_id: str):
    if lobby_id not in active_lobbies:
        await websocket.close(code=1008, reason="Lobby not found")
        return
    
    await manager.connect_to_lobby(websocket, lobby_id)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Handle different message types
            if message.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif message.get("type") == "get_lobby_state":
                lobby = active_lobbies[lobby_id]
                await websocket.send_text(json.dumps({
                    "type": "lobby_state",
                    "data": lobby.dict()
                }))
    except WebSocketDisconnect:
        manager.disconnect_from_lobby(websocket, lobby_id)

def card_value_index(card):
    return values.index(card.value) + 1

def is_winning_combination(cards: list) -> bool:
    values_idx = [card_value_index(card) for card in cards]
    value_counts = {}
    for v in values_idx:
        value_counts[v] = value_counts.get(v, 0) + 1
    
    # Check for exactly one pair
    pairs = [v for v, count in value_counts.items() if count == 2]
    if len(pairs) != 1:
        return False
    
    pair_value = pairs[0]
    
    # Get remaining cards (excluding the pair)
    remaining = []
    for v in values_idx:
        if v == pair_value:
            # Only add one instance of the pair value to remaining
            if remaining.count(v) < 1:
                remaining.append(v)
        else:
            remaining.append(v)
    
    # Should have exactly 2 remaining cards
    if len(remaining) != 2:
        return False
    
    remaining = sorted(remaining)
    
    # Check if they form a sequence (followers)
    # Handle wrap-around case: K, A (13, 1) should be valid
    if remaining == [1, 13]:  # A, K
        return True
    
    # Check consecutive values
    diff = remaining[1] - remaining[0]
    return diff == 1

def check_any_player_win(players, pot):
    pot_top = pot[-1] if pot else None
    for player in players:
        # Check if player has 4 cards and forms a winning combination
        if len(player.hand) == 4 and is_winning_combination(player.hand):
            print(f"WIN: {player.name} with {[f'{c.value}{c.suit}' for c in player.hand]}")
            return player.name, [c.dict() for c in player.hand]
        
        # Check if player has 3 cards and can use the discard pile to win
        if pot_top and len(player.hand) == 3:
            test_hand = player.hand + [pot_top]
            if is_winning_combination(test_hand):
                print(f"WIN: {player.name} with {[f'{c.value}{c.suit}' for c in test_hand]}")
                return player.name, [c.dict() for c in test_hand]
    return None, None

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

