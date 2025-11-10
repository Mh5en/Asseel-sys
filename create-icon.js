const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const path = require('path');

async function createIcon() {
  try {
    // استخدام SVG من assets
    const svgPath = path.join(__dirname, 'assets', 'aseel_main_icon.svg');
    const icoPath = path.join(__dirname, 'build', 'icon.ico');
    
    // إنشاء مجلد build إذا لم يكن موجوداً
    const buildDir = path.join(__dirname, 'build');
    if (!fs.existsSync(buildDir)) {
      fs.mkdirSync(buildDir, { recursive: true });
    }
    
    // قراءة SVG وتحويله إلى PNG بحجم 256x256
    const pngBuffer = await sharp(svgPath)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toBuffer();
    
    // إنشاء ICO بأحجام متعددة (256, 128, 64, 48, 32, 16)
    const sizes = [256, 128, 64, 48, 32, 16];
    const buffers = await Promise.all(
      sizes.map(size =>
        sharp(svgPath)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0 }
          })
          .png()
          .toBuffer()
      )
    );
    
    // تحويل PNG إلى ICO
    const icoBuffer = await toIco(buffers);
    
    // حفظ ICO
    fs.writeFileSync(icoPath, icoBuffer);
    console.log('✅ تم إنشاء الأيقونة من SVG بنجاح:', icoPath);
    console.log('📐 الأحجام المتوفرة في ICO:', sizes.join(', '));
  } catch (error) {
    console.error('❌ خطأ في إنشاء الأيقونة:', error);
    process.exit(1);
  }
}

createIcon();

