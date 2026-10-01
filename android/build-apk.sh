#!/usr/bin/env bash
# Builds the SanaD Android app (a Trusted Web Activity that opens
# https://sanad-app-t7ja.onrender.com full screen) and puts it on the site at
# /download/SanaD.apk, with /download/android.json describing it.
#
#   ./build-apk.sh 1.0.1 2      # version name, version code (code must grow)
#
# Needs JDK 17+, the Android SDK (sdk.dir in local.properties) and the signing
# key in signing/ (not in git: every update must be signed with that same key,
# or phones refuse to install it over the old one).
set -euo pipefail
cd "$(dirname "$0")"

NAME="${1:-1.0.0}"
CODE="${2:-1}"
BT="${BUILD_TOOLS:-D:/Android/Sdk/build-tools/35.0.0}"
# On Windows apksigner is a .bat, run through cmd.
if [ -f "$BT/apksigner.bat" ]; then APKSIGNER=(cmd //c "$(cygpath -w "$BT/apksigner.bat")"); else APKSIGNER=("$BT/apksigner"); fi
PW="$(grep '^password=' signing/signing.txt | cut -d= -f2)"
OUT="../client/public/download"

sed -i -E "s/versionCode [0-9]+/versionCode $CODE/; s/versionName \"[^\"]+\"/versionName \"$NAME\"/" app/build.gradle
./gradlew assembleRelease --no-daemon -q

mkdir -p build "$OUT"
"$BT/zipalign" -f -p 4 app/build/outputs/apk/release/app-release-unsigned.apk build/aligned.apk
"${APKSIGNER[@]}" sign --ks signing/sanad-release.keystore --ks-key-alias sanad --ks-pass "pass:$PW" --key-pass "pass:$PW" --out "$OUT/SanaD.apk" build/aligned.apk
"${APKSIGNER[@]}" verify "$OUT/SanaD.apk"
rm -f "$OUT/SanaD.apk.idsig"

SIZE=$(wc -c < "$OUT/SanaD.apk" | tr -d ' ')
SHA=$(sha256sum "$OUT/SanaD.apk" | cut -d' ' -f1)
printf '{\n  "versionName": "%s",\n  "versionCode": %s,\n  "size": %s,\n  "sha256": "%s",\n  "minAndroid": "7.0",\n  "builtAt": "%s"\n}\n' "$NAME" "$CODE" "$SIZE" "$SHA" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$OUT/android.json"
echo "SanaD $NAME ($CODE): $SIZE bytes → $OUT/SanaD.apk"
