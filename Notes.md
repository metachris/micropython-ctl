https://mermaid-js.github.io/mermaid-live-editor

stateDiagram-v2
    [*] --> Connecting
    Connecting --> WebsocketConnected
    WebsocketConnected --> InvalidPassword
    WebsocketConnected --> ReplConnected

import os; os.listdir()

for x in range(3):
    print(x)
