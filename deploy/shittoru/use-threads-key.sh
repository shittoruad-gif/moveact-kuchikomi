#!/usr/bin/env bash
# Threads Studio（同じサーバーで動いているもの）の Gemini キーを、しっとる用の口コミアプリに写す。
#   ssh root@163.44.103.9 /opt/shittoru-kuchikomi/use-threads-key.sh
# キーは画面に出さない。Threads Studio が GEMINI_API_KEY を持っていなければ、
# Forge ゲートウェイ（BUILT_IN_FORGE_API_URL/KEY）を OpenAI 互換の入口として使う。
set -euo pipefail
cd /opt/shittoru-kuchikomi
SRC=""
for c in $(docker ps -q); do
  if docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$c" | grep -q '^THREADS_APP_ID='; then SRC=$c; break; fi
done
[ -n "$SRC" ] || { echo "Threads Studio のコンテナが見つかりません"; exit 1; }
envof() { docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$SRC" | grep -E "^$1=" | head -1 | cut -d= -f2- || true; }
KEY=$(envof GEMINI_API_KEY); BASE=$(envof GEMINI_BASE_URL); MODEL=$(envof GEMINI_MODEL)
if [ -z "$KEY" ]; then
  KEY=$(envof BUILT_IN_FORGE_API_KEY); FORGE=$(envof BUILT_IN_FORGE_API_URL)
  BASE="${FORGE:-https://forge.manus.im}"; BASE="${BASE%/}/v1/"
  echo "Threads Studio は Forge 経由なので、口コミアプリも Forge 経由にします"
fi
[ -n "$KEY" ] || { echo "Threads Studio にキーが入っていません"; exit 1; }
grep -v -E '^(GEMINI_API_KEY|GEMINI_BASE_URL|GEMINI_MODEL)=' .env > .env.new
{ echo "GEMINI_API_KEY=$KEY"; echo "GEMINI_BASE_URL=$BASE"; echo "GEMINI_MODEL=$MODEL"; } >> .env.new
mv .env.new .env; chmod 600 .env
docker compose -f compose.yml -f labels.yml up -d app
echo "Threads Studio のキーを入れ、口コミアプリを作り直しました。"
