/** 받침 유무로 조사 고르기: josa('술자리', '은', '는') → '술자리는' */
export function josa(word: string, withBatchim: string, without: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00
  const has = code >= 0 && code <= 11171 && code % 28 !== 0
  return word + (has ? withBatchim : without)
}
