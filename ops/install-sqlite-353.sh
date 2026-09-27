#!/usr/bin/env bash
# Build SQLite 3.53+ into /usr/local for JSONB (Ubuntu apt sqlite is often older).
set -euo pipefail

VERSION=3530400
PREFIX=/usr/local
WORKDIR=/tmp/sqlite-build-$$
trap 'rm -rf "$WORKDIR"' EXIT

mkdir -p "$WORKDIR"
cd "$WORKDIR"
curl -fsSL "https://www.sqlite.org/2026/sqlite-autoconf-${VERSION}.tar.gz" -o sqlite.tar.gz
tar xzf sqlite.tar.gz
cd sqlite-autoconf-${VERSION}
./configure --prefix="$PREFIX"
make -j"$(nproc)"
make install
ldconfig 2>/dev/null || true

echo "Installed: $("$PREFIX/bin/sqlite3" --version)"
echo "Set for builds:"
echo "  export PKG_CONFIG_PATH=$PREFIX/lib/pkgconfig:\$PKG_CONFIG_PATH"
echo "  export SQLITE3_LIB_DIR=$PREFIX/lib"
echo "  export SQLITE3_INCLUDE_DIR=$PREFIX/include"
