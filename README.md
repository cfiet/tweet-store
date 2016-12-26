# tweet-store

```
tweet-store [args]

Queue settings
  --queue-url, -q                RabbitMQ URL  [string] [required]
  --queue-source-name, -s        RabbitMQ source queue name  [string] [required] [default: "lineofnorth.tweets.northern.persist"]
  --queue-expected-app-id        RabbitMQ expected message app id  [string] [required] [default: "fetch-tweet"]
  --queue-expected-message-type  RabbitMQ expected message type  [string] [required] [default: "tweet"]
  --queue-channel-prefetch       RabbitMQ channel prefetch setting  [number] [required] [default: 1000]
  --queue-no-message-sleep-time  Sleep time in milliseconds between consecutive unsuccessful message retrievals  [number] [required] [default: 1500]

Database settings
  --database-connection-string  Database connection string  [string] [required]

Options:
  -h, --help  Show help  [boolean]
```