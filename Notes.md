https://mermaid-js.github.io/mermaid-live-editor

stateDiagram-v2
    [*] --> Connecting
    Connecting --> WebsocketConnected
    WebsocketConnected --> InvalidPassword
    WebsocketConnected --> ReplConnected
