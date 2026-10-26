import fsDriver from 'unstorage/drivers/fs'

// Uploaded photos: S3-compatible storage (Cloudflare R2, AWS S3, Backblaze…)
// when S3_BUCKET is set, otherwise a folder on disk (fine for one server).
export default defineNitroPlugin(() => {
  const { s3, uploadsDir } = serverConfig()
  if (s3.bucket) {
    addStartupTask(import('unstorage/drivers/s3').then(({ default: s3Driver }) => {
      useStorage().mount('uploads', s3Driver({
        bucket: s3.bucket, region: s3.region, endpoint: s3.endpoint, accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey,
      }))
    }))
    return
  }
  useStorage().mount('uploads', fsDriver({ base: uploadsDir }))
  if (!import.meta.dev) console.warn(`[uploads] storing photos on disk in ${uploadsDir}; set S3_BUCKET for production`)
})
