import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

/**
 * Take or choose a photo. Uses the native camera sheet in the apps and a file
 * picker (which offers the camera on phones) on the web. Returns a data URL,
 * or null if the person cancels.
 */
export async function pickPhoto(source: 'camera' | 'library' | 'prompt' = 'prompt'): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    try {
      const photo = await Camera.getPhoto({
        quality: 70,
        width: 1600,
        resultType: CameraResultType.DataUrl,
        source: source === 'camera' ? CameraSource.Camera : source === 'library' ? CameraSource.Photos : CameraSource.Prompt,
      })
      return photo.dataUrl ?? null
    } catch {
      return null
    }
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    if (source === 'camera') input.capture = 'environment'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const reader = new FileReader()
      reader.onload = () => (typeof reader.result === 'string' ? shrinkPhoto(reader.result).then(resolve) : resolve(null))
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }
    input.click()
  })
}

/** Scale a photo down to at most `max` px on its longest side as a JPEG, to keep uploads small on mobile data. */
export function shrinkPhoto(dataUrl: string, max = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(dataUrl)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}
