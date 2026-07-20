const SHORT_IMAGE_VERSION_LENGTH = 8

function appendQuery(path: string, query: string): string {
  const hashIndex = path.indexOf('#')
  const hash = hashIndex >= 0 ? path.slice(hashIndex) : ''
  const pathWithoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path
  const separator = pathWithoutHash.includes('?') ? '&' : '?'

  return `${pathWithoutHash}${separator}${query}${hash}`
}

export function jokerImageUrl(imagePath: string, localImageSha1: string, retry = false): string {
  const version = encodeURIComponent(localImageSha1.slice(0, SHORT_IMAGE_VERSION_LENGTH))
  const versionedPath = appendQuery(imagePath, `v=${version}`)

  return retry ? appendQuery(versionedPath, 'retry=1') : versionedPath
}
