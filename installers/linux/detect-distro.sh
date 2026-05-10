#!/usr/bin/env bash
set -euo pipefail

OS_RELEASE_FILE="${OS_RELEASE_FILE:-/etc/os-release}"

id="unknown"
id_like=""
pretty_name="Linux"

if [ -r "$OS_RELEASE_FILE" ]; then
  while IFS='=' read -r key value; do
    value="${value%\"}"
    value="${value#\"}"
    case "$key" in
      ID) id="$value" ;;
      ID_LIKE) id_like="$value" ;;
      PRETTY_NAME) pretty_name="$value" ;;
    esac
  done < "$OS_RELEASE_FILE"
fi

id_lc="$(printf '%s' "$id" | tr '[:upper:]' '[:lower:]')"
id_like_lc="$(printf '%s' "$id_like" | tr '[:upper:]' '[:lower:]')"
family="unsupported"

case "$id_lc" in
  ubuntu)
    family="ubuntu_like"
    ;;
  debian)
    family="debian_like"
    ;;
  arch|manjaro|endeavouros)
    family="arch_like"
    ;;
  *)
    case " $id_like_lc " in
      *" ubuntu "*)
        family="ubuntu_like"
        ;;
      *" debian "*)
        family="debian_like"
        ;;
      *" arch "*)
        family="arch_like"
        ;;
    esac
    ;;
esac

supported=false
if [ "$family" != "unsupported" ]; then
  supported=true
fi

printf 'family=%s\n' "$family"
printf 'id=%s\n' "$id_lc"
printf 'pretty_name=%s\n' "$pretty_name"
printf 'supported=%s\n' "$supported"
