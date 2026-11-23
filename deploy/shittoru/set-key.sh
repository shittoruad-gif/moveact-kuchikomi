#!/usr/bin/env bash
# しっとる用の口コミアプリに GEMINI_API_KEY を入れる。サーバーで、人が1回だけ実行する。
#   ssh -t root@163.44.103.9 /opt/shittoru-kuchikomi/set-key.sh
# キーは画面にも履歴にも残らない。入れたあと、しっとる用のアプリだけを作り直す。
set -euo pipefail
cd /opt/shittoru-kuchikomi
read -rsp "GEMINI_API_KEY（しっとる名義のキー）: " KEY; echo
[ -n "$KEY" ] || { echo "空なので何もしません"; exit 1; }
grep -v '^GEMINI_API_KEY=' .env > .env.new
echo "GEMINI_API_KEY=$KEY" >> .env.new
mv .env.new .env; chmod 600 .env
docker compose -f compose.yml -f labels.yml up -d app
echo "入れました。アプリを作り直しました。"
