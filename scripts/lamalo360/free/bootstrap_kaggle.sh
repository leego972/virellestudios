#!/usr/bin/env bash
set -euo pipefail

ROOT="${LAMALO_REPO_ROOT:-$(pwd)}"
WORK_ROOT="${LAMALO360_WORK_ROOT:-/kaggle/working/lamalo360-work}"
MODEL_ROOT="${LAMALO_MODEL_ROOT:-/kaggle/working}"
PYTHON_BIN="${LAMALO_PYTHON_BIN:-python}"

"$PYTHON_BIN" -m pip install --upgrade pip setuptools wheel
"$PYTHON_BIN" -m pip install -r "$ROOT/scripts/lamalo360/free/requirements.txt"

if ! command -v blender >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1; then
    sudo apt-get update -y
    sudo apt-get install -y blender libgl1 libglib2.0-0 git-lfs
  else
    apt-get update -y
    apt-get install -y blender libgl1 libglib2.0-0 git-lfs
  fi
fi

TRIPOSR_HOME="${TRIPOSR_HOME:-$MODEL_ROOT/TripoSR}"
if [ ! -f "$TRIPOSR_HOME/run.py" ]; then
  git clone --depth 1 https://github.com/VAST-AI-Research/TripoSR.git "$TRIPOSR_HOME"
fi
"$PYTHON_BIN" -m pip install -r "$TRIPOSR_HOME/requirements.txt"
"$PYTHON_BIN" -m pip install --upgrade 'setuptools>=69' xatlas

TRELLIS_HOME="${TRELLIS_HOME:-$MODEL_ROOT/TRELLIS}"
if [ "${LAMALO_INSTALL_TRELLIS:-1}" = "1" ] && [ ! -d "$TRELLIS_HOME/trellis" ]; then
  git clone --recurse-submodules --depth 1 https://github.com/microsoft/TRELLIS.git "$TRELLIS_HOME"
  pushd "$TRELLIS_HOME" >/dev/null
  # Free P100/T4-class notebook GPUs use xFormers rather than FlashAttention.
  export ATTN_BACKEND=xformers
  export SPCONV_ALGO=native
  set +e
  . ./setup.sh --basic --xformers --diffoctreerast --spconv --mipgaussian --kaolin --nvdiffrast
  trellis_status=$?
  set -e
  popd >/dev/null
  if [ "$trellis_status" -ne 0 ]; then
    echo "TRELLIS installation did not complete; TripoSR remains available as the zero-cost fallback." >&2
  fi
fi

mkdir -p "$WORK_ROOT"
cat <<EOF
Lamalo free 360 runtime ready.
LAMALO360_WORK_ROOT=$WORK_ROOT
TRIPOSR_HOME=$TRIPOSR_HOME
TRELLIS_HOME=$TRELLIS_HOME
BLENDER_BIN=$(command -v blender)
LAMALO_PYTHON_BIN=$PYTHON_BIN
EOF
