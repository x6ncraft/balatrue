import { useEffect, useState, type ImgHTMLAttributes } from 'react'

import type { Joker } from '../data/types'
import { jokerImageUrl } from '../ui/joker-image'

export interface JokerImageProps extends Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'onError'
> {
  readonly joker: Pick<Joker, 'imagePath' | 'source'>
  readonly fallbackLabel: string
}

interface ImageFailure {
  readonly key: string
  readonly count: number
}

const IMAGE_RETRY_DELAY_MS = 450

export function JokerImage({
  joker,
  alt,
  fallbackLabel,
  className,
  ...imageProps
}: JokerImageProps) {
  const imageKey = `${joker.imagePath}:${joker.source.localImageSha1}`
  const [failure, setFailure] = useState<ImageFailure | null>(null)
  const [retryReadyKey, setRetryReadyKey] = useState<string | null>(null)
  const failureCount = failure?.key === imageKey ? failure.count : 0
  const imageClassName = ['joker-image', className].filter(Boolean).join(' ')
  const decorative = alt === ''

  useEffect(() => {
    if (failureCount !== 1) return
    const timer = window.setTimeout(() => setRetryReadyKey(imageKey), IMAGE_RETRY_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [failureCount, imageKey])

  if (failureCount === 1 && retryReadyKey !== imageKey) {
    return (
      <span
        className={`${imageClassName} joker-image--unavailable joker-image--retrying`}
        aria-hidden="true"
      />
    )
  }

  if (failureCount >= 2) {
    return (
      <span
        className={`${imageClassName} joker-image--unavailable`}
        role={decorative ? undefined : 'img'}
        aria-hidden={decorative ? 'true' : undefined}
        aria-label={decorative ? undefined : fallbackLabel}
        title={decorative ? undefined : fallbackLabel}
      />
    )
  }

  return (
    <img
      {...imageProps}
      className={imageClassName}
      src={jokerImageUrl(
        joker.imagePath,
        joker.source.localImageSha1,
        failureCount === 1 && retryReadyKey === imageKey,
      )}
      alt={alt}
      onError={() => {
        setFailure((current) => {
          const currentCount = current?.key === imageKey ? current.count : 0
          return { key: imageKey, count: Math.min(currentCount + 1, 2) }
        })
      }}
    />
  )
}

export default JokerImage
