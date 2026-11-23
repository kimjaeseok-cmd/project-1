export async function compressImageForUpload(
  file: File,
  maxDimension = 1280,
  quality = 0.82
): Promise<{ base64: string; mimeType: string; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('이미지 파일을 읽을 수 없습니다.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('지원하지 않는 이미지 형식입니다.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('이미지를 처리할 수 없습니다.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const base64 = dataUrl.split(',')[1] ?? '';
        resolve({
          base64,
          mimeType: 'image/jpeg',
          previewUrl: dataUrl,
        });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

let sharedAudioCtx: AudioContext | null = null;

export function playTimerChime(): void {
  try {
    const AudioContextCtor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextCtor();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }

    const now = sharedAudioCtx.currentTime;
    const notes = [587.33, 783.99, 1046.5]; // D5 -> G5 -> C6 warm kitchen chime
    notes.forEach((freq, idx) => {
      if (!sharedAudioCtx) return;
      const osc = sharedAudioCtx.createOscillator();
      const gain = sharedAudioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.16);
      gain.gain.setValueAtTime(0.001, now + idx * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.16 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.16 + 0.55);
      osc.connect(gain);
      gain.connect(sharedAudioCtx.destination);
      osc.start(now + idx * 0.16);
      osc.stop(now + idx * 0.16 + 0.6);
    });
  } catch {
    // Ignore audio blocked errors
  }
}

export function formatScaledAmount(amount: number, unit: string): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return unit || '적당량';
  }
  const lowerUnit = unit.trim();
  if (lowerUnit === '적당량' || lowerUnit === '약간') {
    return lowerUnit;
  }
  if (lowerUnit === 'g' || lowerUnit === 'ml') {
    const rounded = amount >= 10 ? Math.round(amount) : Math.round(amount * 10) / 10;
    return `${rounded}${lowerUnit}`;
  }
  // Household units: 0.5 step precision
  const halfRounded = Math.round(amount * 2) / 2;
  const display = halfRounded === 0 ? 0.5 : halfRounded;
  return `${display}${lowerUnit}`;
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
