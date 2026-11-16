#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
git clone --depth 1 --filter=blob:none https://github.com/ggml-org/llama.cpp.git upstream
base="upstream/examples/llama.android"
cp overlay/MainActivity.kt "$base/app/src/main/java/com/example/llama/MainActivity.kt"
cp overlay/AndroidManifest.xml "$base/app/src/main/AndroidManifest.xml"
python3 - "$base" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
a=p/'app/build.gradle.kts'
s=a.read_text()
assert 'minSdk = 33' in s, 'Upstream app minSdk changed; patch needs review'
s=s.replace('minSdk = 33', 'minSdk = 26').replace('targetSdk = 36', 'targetSdk = 35')
s=s.replace('applicationId = "com.example.llama.aichat"', 'applicationId = "dev.qwen.pocket"')
s=s.replace('versionName = "1.0"', 'versionName = "1.0.0"')
a.write_text(s)
b=p/'lib/build.gradle.kts'
s=b.read_text()
assert 'minSdk = 33' in s, 'Upstream library minSdk changed; patch needs review'
s=s.replace('minSdk = 33', 'minSdk = 26')
s=s.replace('listOf("arm64-v8a", "x86_64")', 'listOf("arm64-v8a")')
s=s.replace('"-DGGML_CPU_ALL_VARIANTS=ON"', '"-DGGML_CPU_ALL_VARIANTS=OFF"')
b.write_text(s)
cpp=p/'lib/src/main/cpp/ai_chat.cpp'
s=cpp.read_text()
assert 'DEFAULT_CONTEXT_SIZE    = 8192' in s, 'Upstream context implementation changed'
assert 'BATCH_SIZE              = 512' in s, 'Upstream batch setting changed'
s=s.replace('DEFAULT_CONTEXT_SIZE    = 8192', 'DEFAULT_CONTEXT_SIZE    = 2048')
s=s.replace('BATCH_SIZE              = 512', 'BATCH_SIZE              = 128')
cpp.write_text(s)
print('Android 11/arm64/2048-token patches applied')
PY
