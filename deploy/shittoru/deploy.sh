#!/usr/bin/env bash
# しっとる用の口コミアプリを本番サーバーに出す（Moveact のアプリ・DBには触らない）。
#
#   deploy/shittoru/deploy.sh                          … 今のコミットでアプリを作り直すだけ
#   deploy/shittoru/deploy.sh tenants/<slug>.json ...  … そのお店を登録してから出す
#
# やること:
#   1. サーバーの /opt/shittoru-kuchikomi に compose.yml と .env を置く（.env の秘密の値は初回だけ作り、以後は残す）
#   2. 今の HEAD のコードを git archive で送り、サーバーでイメージを作る
#   3. tenants/*.json（example 以外）の hosts と、仮のアドレス <slug>.163.44.103.9.sslip.io を Traefik に渡す
#   4. docker compose up -d（作り直すのはしっとる用のコンテナだけ）
#   5. 引数のお店を、しっとる用DBに登録する（もうあれば飛ばす）
#   6. 各お店のアドレスが開けるか確かめる
#
# 本番に出すのは三上様の承諾のあと（docs/ヒアリングから作る手順.md の手順7）。
# GEMINI_API_KEY はこのスクリプトでは入れない。初回のあと、サーバーで次を1回だけ行う:
#   ssh -t root@163.44.103.9 /opt/shittoru-kuchikomi/set-key.sh
set -euo pipefail

SERVER=root@163.44.103.9
IP=163.44.103.9
DIR=/opt/shittoru-kuchikomi
cd "$(git rev-parse --show-toplevel)"

if [ -n "$(git status --porcelain -- server shared src package.json package-lock.json Dockerfile)" ]; then
  echo "コードにコミットしていない変更があります。コミットしてから流してください" >&2
  exit 1
fi
TAG=$(git rev-parse --short HEAD)

# --- お店の一覧（tenants/*.json のうち example 以外）から、ドメインを集める ---
TENANT_FILES=()
for f in tenants/*.json; do [ "$f" = tenants/example.json ] || TENANT_FILES+=("$f"); done
HOSTS=$(node -e '
  const fs = require("fs"); const ip = process.argv[1]; const out = [];
  for (const f of process.argv.slice(2)) {
    const t = JSON.parse(fs.readFileSync(f, "utf8"));
    out.push(...t.hosts, `${t.slug}.${ip}.sslip.io`);
  }
  console.log([...new Set(out.map((h) => h.trim().toLowerCase()))].join(" "));
' "$IP" "${TENANT_FILES[@]}")
RULE=$(for h in $HOSTS; do printf 'Host(`%s`) || ' "$h"; done | sed 's/ || $//')
FIRST_SLUG=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).slug' "${TENANT_FILES[0]}")
echo "コード: $TAG"
echo "ドメイン: $HOSTS"

# --- 1. compose.yml / set-key.sh / .env を置く ---
ssh "$SERVER" "mkdir -p $DIR && chmod 700 $DIR"
scp -q deploy/shittoru/compose.yml deploy/shittoru/set-key.sh "$SERVER:$DIR/"
ssh "$SERVER" bash -s -- "$DIR" "$TAG" "$RULE" "$FIRST_SLUG" <<'REMOTE'
set -euo pipefail
DIR=$1; TAG=$2; RULE=$3; FIRST=$4
cd "$DIR"; chmod 700 set-key.sh
touch .env; chmod 600 .env
get() { grep -E "^$1=" .env | head -1 | cut -d= -f2- || true; }
DBP=$(get DB_PASSWORD);      [ -n "$DBP" ] || DBP=$(openssl rand -hex 24)
DBR=$(get DB_ROOT_PASSWORD); [ -n "$DBR" ] || DBR=$(openssl rand -hex 24)
DEF=$(get DEFAULT_TENANT);   [ -n "$DEF" ] || DEF=$FIRST
{
  echo "DB_PASSWORD=$DBP"
  echo "DB_ROOT_PASSWORD=$DBR"
  echo "GEMINI_API_KEY=$(get GEMINI_API_KEY)"
  echo "GEMINI_MODEL=$(get GEMINI_MODEL)"
  echo "NOTIFY_HUB_URL=$(get NOTIFY_HUB_URL)"
  echo "NOTIFY_HUB_KEY=$(get NOTIFY_HUB_KEY)"
  echo "DEFAULT_TENANT=$DEF"
  echo "APP_TAG=$TAG"
  echo "TRAEFIK_RULE='$RULE'"
} > .env.new
mv .env.new .env; chmod 600 .env
REMOTE

# --- 2. イメージを作る ---
if ssh "$SERVER" "docker image inspect shittoru-kuchikomi:$TAG >/dev/null 2>&1"; then
  echo "イメージ shittoru-kuchikomi:$TAG はもうあります"
else
  echo "サーバーでイメージを作っています（数分かかります）"
  git archive --format=tar HEAD | ssh "$SERVER" "docker build -q -t shittoru-kuchikomi:$TAG -"
fi

# --- 4. 起動（しっとる用のコンテナだけ） ---
ssh "$SERVER" "cd $DIR && docker compose up -d --remove-orphans"
echo "起動を待っています"
for i in $(seq 1 60); do
  if ssh "$SERVER" "docker logs shittoru-kuchikomi-app-1 2>&1 | grep -q 'migrate\] 完了'"; then break; fi
  sleep 5
done
ssh "$SERVER" "docker logs --tail 5 shittoru-kuchikomi-app-1 2>&1"

# --- 5. お店を登録する（仮の sslip.io アドレスも hosts に足す） ---
for f in "$@"; do
  node -e '
    const t = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const extra = `${t.slug}.${process.argv[2]}.sslip.io`;
    if (!t.hosts.includes(extra)) t.hosts.push(extra);
    process.stdout.write(JSON.stringify(t));
  ' "$f" "$IP" \
  | ssh "$SERVER" "docker exec -i -w /app shittoru-kuchikomi-app-1 npx tsx server/db/addTenant.ts - --apply" \
  || echo "（$f は登録済みか、登録できませんでした。上の表示を見てください）"
done

# --- 6. 確かめる ---
sleep 5
for h in $HOSTS; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "https://$h/" || true)
  title=$(curl -s --max-time 20 "https://$h/" | grep -o '<title>[^<]*' | sed 's/<title>//' || true)
  echo "https://$h/  →  $code  $title"
done
if ! ssh "$SERVER" "grep -q '^GEMINI_API_KEY=.\+' $DIR/.env"; then
  echo
  echo "※ GEMINI_API_KEY がまだ入っていません。次を実行してキーを入れてください（画面に表示されません）:"
  echo "   ssh -t $SERVER $DIR/set-key.sh"
fi
