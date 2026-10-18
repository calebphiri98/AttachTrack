const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
const MIN_SAVING_RATIO = 0.92;
const SKIP_BELOW_BYTES = 300 * 1024;

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Image could not be read'));
    };
    image.src = url;
  });
}

async function decode(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      try {
        return await createImageBitmap(file);
      } catch {
        return loadImageElement(file);
      }
    }
  }
  return loadImageElement(file);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function jpegName(name) {
  const base = name.replace(/\.[^./\\]+$/, '');
  return `${base || 'photo'}.jpg`;
}

export function isCompressibleImage(file) {
  return (
    Boolean(file) &&
    typeof file.type === 'string' &&
    file.type.startsWith('image/') &&
    !['image/gif', 'image/svg+xml'].includes(file.type)
  );
}

export async function compressImage(file) {
  if (!isCompressibleImage(file)) return file;

  try {
    const source = await decode(file);
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    if (!width || !height) return file;

    const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
    if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
      if (typeof source.close === 'function') source.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (typeof source.close === 'function') source.close();

    const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY);
    if (!blob) return file;
    if (scale === 1 && blob.size >= file.size * MIN_SAVING_RATIO) return file;

    return new File([blob], jpegName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified || Date.now(),
    });
  } catch {
    return file;
  }
}

export async function prepareFiles(files) {
  return Promise.all(Array.from(files || []).map((file) => compressImage(file)));
}

export function describeSize(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function validateFiles(files, { maxFiles = Infinity, maxBytes = Infinity, label = 'file' } = {}) {
  const list = Array.from(files || []);
  if (list.length > maxFiles) {
    return `You can attach at most ${maxFiles} ${label}${maxFiles === 1 ? '' : 's'}`;
  }
  const tooBig = list.find((file) => file.size > maxBytes);
  if (tooBig) {
    return `${tooBig.name} is larger than ${describeSize(maxBytes)}`;
  }
  return '';
}
