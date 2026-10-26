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
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(file)
    }
    input.click()
  })
}
