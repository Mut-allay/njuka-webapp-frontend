/**
 * WebSocket Service
 * 
 * Handles WebSocket connections for real-time game updates and lobby updates.
 * Provides fallback to polling if WebSocket connection fails.
 */

export interface WebSocketMessage {
  type: string
  data?: unknown
  gameId?: string
  lobbyId?: string
  action?: unknown
}

export interface WebSocketService {
  connect: () => Promise<void>
  disconnect: () => void
  send: (message: WebSocketMessage) => void
  onMessage: (callback: (message: WebSocketMessage) => void) => void
  onClose: (callback: () => void) => void
  onError: (callback: (error: Event) => void) => void
  isConnected: () => boolean
}

export class GameWebSocketService implements WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageCallbacks: ((message: WebSocketMessage) => void)[] = []
  private closeCallbacks: (() => void)[] = []
  private errorCallbacks: ((error: Event) => void)[] = []
  private isConnecting = false
  private shouldReconnect = true

  constructor(gameId: string, playerName: string, baseUrl: string = 'wss://njuka-webapp-backend.onrender.com') {
    this.url = `${baseUrl}/ws/game/${gameId}?player_name=${encodeURIComponent(playerName)}`
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        console.log('WebSocket connected to game')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.shouldReconnect = true
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.messageCallbacks.forEach(callback => callback(message))
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        this.isConnecting = false
        this.closeCallbacks.forEach(callback => callback())
        
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
        this.errorCallbacks.forEach(callback => callback(error))
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.isConnecting = false
      throw error
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect()
      }
    }, delay)
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: WebSocketMessage): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void): void {
    this.messageCallbacks.push(callback)
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback)
  }

  onError(callback: (error: Event) => void): void {
    this.errorCallbacks.push(callback)
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  // Ping the server to keep connection alive
  ping(): void {
    if (this.isConnected()) {
      this.send({ type: 'ping' })
    }
  }
}

export class LobbyWebSocketService implements WebSocketService {
  private ws: WebSocket | null = null
  private url: string
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private messageCallbacks: ((message: WebSocketMessage) => void)[] = []
  private closeCallbacks: (() => void)[] = []
  private errorCallbacks: ((error: Event) => void)[] = []
  private isConnecting = false
  private shouldReconnect = true

  constructor(lobbyId: string, baseUrl: string = 'wss://njuka-webapp-backend.onrender.com') {
    this.url = `${baseUrl}/ws/lobby/${lobbyId}`
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return
    }

    this.isConnecting = true

    try {
      this.ws = new WebSocket(this.url)
      
      this.ws.onopen = () => {
        console.log('WebSocket connected to lobby')
        this.isConnecting = false
        this.reconnectAttempts = 0
        this.shouldReconnect = true
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.messageCallbacks.forEach(callback => callback(message))
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        this.isConnecting = false
        this.closeCallbacks.forEach(callback => callback())
        
        if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnecting = false
        this.errorCallbacks.forEach(callback => callback(error))
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.isConnecting = false
      throw error
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts} in ${delay}ms`)
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect()
      }
    }, delay)
  }

  disconnect(): void {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  send(message: WebSocketMessage): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message:', message)
    }
  }

  onMessage(callback: (message: WebSocketMessage) => void): void {
    this.messageCallbacks.push(callback)
  }

  onClose(callback: () => void): void {
    this.closeCallbacks.push(callback)
  }

  onError(callback: (error: Event) => void): void {
    this.errorCallbacks.push(callback)
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  // Ping the server to keep connection alive
  ping(): void {
    if (this.isConnected()) {
      this.send({ type: 'ping' })
    }
  }
}

// Factory functions for creating WebSocket services
export function createGameWebSocketService(gameId: string, playerName: string): GameWebSocketService {
  return new GameWebSocketService(gameId, playerName)
}

export function createLobbyWebSocketService(lobbyId: string): LobbyWebSocketService {
  return new LobbyWebSocketService(lobbyId)
}
