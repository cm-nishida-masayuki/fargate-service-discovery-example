このリポジトリは以下のブログのサンプルリポジトリです

# コマンド

Grafana と influxdb を起動する

```
docker compose up grafana influxdb
```



```
docker compose run --rm -T k6 run -u 10 --rps 10 -d 2.5m -e HOST=xxx.ap-northeast-1.elb.amazonaws.com /scripts/stress.js    
```
