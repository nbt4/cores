#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
renderer_image="${BRANDING_RENDER_IMAGE:-debian:bookworm-slim}"

docker run --rm -v "$repo_root:/workspace" -w /workspace "$renderer_image" bash -eu -o pipefail -c '
  apt-get update -qq
  apt-get install -y -qq --no-install-recommends librsvg2-bin imagemagick >/dev/null

  for svg in logos/*/*.svg; do
    rsvg-convert "$svg" -o "${svg%.svg}.png"
  done

  sync_product() {
    product="$1"
    target="$2"
    mkdir -p "$target/logos" "$target/app-icons"
    cp "logos/$product/"* "$target/logos/"

    make_icon() {
      output="$1"
      canvas="$2"
      artwork="$3"
      rsvg-convert -w "$artwork" -h "$artwork" "logos/$product/${product}_white_icon.svg" -o /tmp/pwa-mark.png
      convert -size "${canvas}x${canvas}" xc:"#101719" /tmp/pwa-mark.png -gravity center -composite "$target/app-icons/$output"
    }

    make_icon icon-180.png 180 112
    make_icon icon-192.png 192 120
    make_icon icon-512.png 512 320
    make_icon icon-maskable-512.png 512 288
  }

  sync_product cores cores-dashboard/web/public
  sync_product rentalcore rentalcore/web/static/images
  sync_product warehousecore warehousecore/web/public
  sync_product plannercore plannercore/web/public
  sync_product procurementcore procurementcore/web/public
'

echo "Branding assets synchronized."
