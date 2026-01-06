// React ve gerekli hook'ları içe aktar
import React, { useRef, useEffect, useMemo, useState } from 'react';
// Three.js React wrapper'ı - 3D sahne oluşturma için
import { Canvas, useFrame, useThree } from '@react-three/fiber';
// 3D parçacık sistemi bileşenleri
import { Points, PointMaterial } from '@react-three/drei';
// Three.js ana kütüphanesi - 3D grafik işlemleri için
import * as THREE from 'three';
// Google MediaPipe - el takibi için yapay zeka kütüphanesi
import { Hands } from '@mediapipe/hands';
// Stil dosyası
import './App.css';

// Toplam parçacık sayısı - 15.000 parçacık ile yoğun bir görsel efekt
const COUNT = 15000;

/**
 * 3D şekil üretme fonksiyonu
 * Farklı geometrik şekillerde parçacık pozisyonları oluşturur
 * @param {string} shape - Oluşturulacak şekil tipi ('SATURN', 'HEART', 'SPHERE')
 * @returns {Float32Array} - X,Y,Z koordinatlarını içeren dizi
 */
const generateShape = (shape) => {
  // Float32Array: Performans için 32-bit float dizi (COUNT * 3 = her parçacık için x,y,z)
  const pos = new Float32Array(COUNT * 3);
  
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3; // Her parçacık için 3 koordinat indeksi (x, y, z)
    let x, y, z; // Parçacık koordinatları
    
    if (shape === 'SATURN') {
      if (i < COUNT * 0.6) { 
        // İlk %60 parçacık: Küre şeklinde (Satürn'ün ana gövdesi)
        const phi = Math.acos(2 * Math.random() - 1); // Rastgele polar açı (0 ile π arası)
        const theta = Math.random() * Math.PI * 2; // Rastgele azimut açı (0 ile 2π arası)
        // Küresel koordinat sisteminden kartezyen koordinatlara dönüşüm
        x = 2.5 * Math.sin(phi) * Math.cos(theta);
        y = 2.5 * Math.sin(phi) * Math.sin(theta);
        z = 2.5 * Math.cos(phi);
      } else { 
        // Son %40 parçacık: Halka şeklinde (Satürn'ün halkası)
        const angle = Math.random() * Math.PI * 2; // Rastgele açı
        const r = 3.5 + Math.random() * 1.5; // Rastgele yarıçap (3.5-5.0 arası)
        x = Math.cos(angle) * r;
        y = Math.sin(angle) * r * 0.2; // Y ekseni sıkıştırılmış (düz halka efekti)
        z = Math.sin(angle) * r;
      }
    } else if (shape === 'HEART') {
      // Kalp şekli: Parametrik kalp denklemi kullanılıyor
      const t = Math.random() * Math.PI * 2; // Rastgele parametre (0-2π)
      // Kalp şeklinin matematiksel formülü
      x = 0.2 * (16 * Math.pow(Math.sin(t), 3));
      y = 0.2 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      z = (Math.random() - 0.5) * 1.5; // Rastgele derinlik (-0.75 ile +0.75 arası)
    } else { 
      // SPHERE: Standart küre şekli
      const phi = Math.acos(2 * Math.random() - 1); // Rastgele polar açı
      const theta = Math.random() * Math.PI * 2; // Rastgele azimut açı
      // Küresel koordinatlardan kartezyen koordinatlara dönüşüm
      x = 3.5 * Math.sin(phi) * Math.cos(theta);
      y = 3.5 * Math.sin(phi) * Math.sin(theta);
      z = 3.5 * Math.cos(phi);
    }
    // Koordinatları diziye kaydet (her parçacık için ardışık x,y,z)
    pos[i3] = x; 
    pos[i3+1] = y; 
    pos[i3+2] = z;
  }
  return pos; // Tüm parçacık pozisyonlarını döndür
};

/**
 * Kamera kontrolcüsü bileşeni
 * Zoom değişikliklerini yumuşak geçişlerle uygular
 * @param {number} targetZoom - Hedef zoom seviyesi
 */
function CameraController({ targetZoom }) {
  const { camera } = useThree(); // Three.js kamerasına erişim
  
  useFrame(() => {
    // Her frame'de kamera pozisyonunu yumuşakça hedef zoom'a yaklaştır
    // 0.1 faktörü: Geçiş hızını kontrol eder (düşük = yavaş, yumuşak)
    camera.position.z += (targetZoom - camera.position.z) * 0.1;
  });
  
  return null; // Bu bileşen görsel çıktı üretmez, sadece kamerayı kontrol eder
}

/**
 * Ana parçacık sistemi bileşeni
 * El hareketlerine tepki veren 3D parçacık animasyonu
 * @param {Object} handPos - El pozisyonu {x, y} (MediaPipe koordinatları)
 * @param {string} shape - Parçacıkların oluşturacağı şekil
 * @param {number} rotationAngle - Manuel rotasyon açısı
 */
function Particles({ handPos, shape, rotationAngle }) {
  const ref = useRef(); // Parçacık sistemine doğrudan erişim için referans
  
  // Hedef şekil pozisyonları - şekil değiştiğinde yeniden hesaplanır
  const targetData = useMemo(() => generateShape(shape), [shape]);
  
  // Başlangıç pozisyonları - parçacıklar hemen görünür olması için hedef pozisyonlarla başlar
  const initialPos = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      // Başlangıçta parçacıkları hedef pozisyonlara yerleştir
      pos[i3] = targetData[i3];     // X koordinatı
      pos[i3 + 1] = targetData[i3 + 1]; // Y koordinatı
      pos[i3 + 2] = targetData[i3 + 2]; // Z koordinatı
    }
    return pos;
  }, [targetData]);

  useFrame((state) => {
    if (!ref.current) return; // Referans hazır değilse çık
    
    const geo = ref.current.geometry.attributes.position; // Geometri pozisyon verilerine erişim
    const time = state.clock.elapsedTime; // Animasyon için geçen süre

    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3; // Her parçacık için indeks hesapla
      
      // Hedef pozisyonları al
      let tx = targetData[i3];     // Hedef X
      let ty = targetData[i3 + 1]; // Hedef Y
      let tz = targetData[i3 + 2]; // Hedef Z

      // Manuel rotasyon uygula (el hareketi veya buton ile)
      if (rotationAngle !== 0) {
        const cos = Math.cos(rotationAngle); // Cosinus değeri
        const sin = Math.sin(rotationAngle); // Sinus değeri
        // Y ekseni etrafında rotasyon matrisi uygula
        const newX = tx * cos - tz * sin;
        const newZ = tx * sin + tz * cos;
        tx = newX;
        tz = newZ;
      }

      // El etkileşimi kontrolü
      if (handPos && handPos.x !== undefined && handPos.y !== undefined) {
        // MediaPipe koordinatlarını (0-1) Three.js koordinatlarına (-7.5 ile +7.5) çevir
        const hx = (handPos.x - 0.5) * 15; // El X pozisyonu
        const hy = (0.5 - handPos.y) * 15; // El Y pozisyonu (Y ekseni ters çevrildi)
        const hz = 0; // El her zaman Z=0 düzleminde kabul edilir
        
        // Parçacık ile el arasındaki 3D Öklid mesafesi
        const dx = hx - geo.array[i3];     // X farkı
        const dy = hy - geo.array[i3 + 1]; // Y farkı
        const dz = hz - geo.array[i3 + 2]; // Z farkı
        const distance3D = Math.sqrt(dx * dx + dy * dy + dz * dz); // Toplam mesafe
        
        const interactionRadius = 4.0; // Etkileşim yarıçapı (birim: Three.js koordinat)
        
        if (distance3D < interactionRadius) {
          // Mesafe tabanlı kuvvet hesaplama (yakın = güçlü, uzak = zayıf)
          const force = (interactionRadius - distance3D) / interactionRadius;
          const pushStrength = force * 1.2; // İtme gücü çarpanı
          
          // Yön vektörünü normalize et (birim vektör oluştur)
          const normalizedDx = distance3D > 0 ? dx / distance3D : 0;
          const normalizedDy = distance3D > 0 ? dy / distance3D : 0;
          const normalizedDz = distance3D > 0 ? dz / distance3D : 0;
          
          // Parçacıkları elden uzaklaştır (itme efekti)
          tx += normalizedDx * pushStrength;
          ty += normalizedDy * pushStrength;
          // Z ekseninde sinüs dalgası ile ekstra hareket efekti
          tz += normalizedDz * pushStrength + Math.sin(time * 3 + i * 0.1) * 0.3;
        }
      }

      // Yumuşak geçiş: Mevcut pozisyondan hedef pozisyona yavaşça hareket
      // 0.08 faktörü: Geçiş hızı (düşük = yavaş, yumuşak hareket)
      geo.array[i3] += (tx - geo.array[i3]) * 0.08;         // X pozisyonu güncelle
      geo.array[i3 + 1] += (ty - geo.array[i3 + 1]) * 0.08; // Y pozisyonu güncelle
      geo.array[i3 + 2] += (tz - geo.array[i3 + 2]) * 0.08; // Z pozisyonu güncelle
    }
    
    geo.needsUpdate = true; // Three.js'e geometrinin güncellendiğini bildir
    // Sürekli yavaş otomatik rotasyon (0.0005 radyan/frame)
    ref.current.rotation.y += 0.0005;
  });

  return (
    <Points ref={ref} positions={initialPos} stride={3}>
      <PointMaterial 
        transparent          // Şeffaflık desteği
        color="#ffdf7e"     // Altın sarısı renk
        size={0.06}         // Parçacık boyutu
        sizeAttenuation={true} // Mesafeye göre boyut küçültme
        blending={THREE.AdditiveBlending} // Işık efekti (parçacıklar birbirine eklenince parlar)
        depthWrite={false}  // Derinlik yazma kapalı (şeffaflık için gerekli)
      />
    </Points>
  );
}

/**
 * Ana uygulama bileşeni
 * 3D parçacık sistemi, el takibi ve kullanıcı arayüzünü birleştirir
 */
export default function App() {
  // Referanslar
  const videoRef = useRef(null); // HTML video elementi için referans
  const previousPinchDistance = useRef(null); // Önceki parmak mesafesi (zoom için)
  const previousHandX = useRef(null); // Önceki el X pozisyonu (rotasyon için)
  
  // State değişkenleri
  const [handPos, setHandPos] = useState(null); // El pozisyonu {x, y} veya null
  const [shape, setShape] = useState('SATURN'); // Seçili şekil ('SATURN', 'HEART', 'SPHERE')
  const [zoom, setZoom] = useState(15); // Kamera zoom seviyesi (5-30 arası)
  const [rotationAngle, setRotationAngle] = useState(0); // Manuel rotasyon açısı (radyan)
  const [cameraStatus, setCameraStatus] = useState('Başlatılıyor...'); // Kamera durum mesajı
  const [handDetected, setHandDetected] = useState(false); // El tespit durumu (true/false)
  const [showDebugVideo, setShowDebugVideo] = useState(true); // Debug video gösterim durumu (varsayılan açık)
  const [cameraPermission, setCameraPermission] = useState('pending'); // Kamera izni durumu: 'pending', 'granted', 'denied'
  const [showPermissionDialog, setShowPermissionDialog] = useState(false); // İzin dialog gösterimi

  /**
   * Kamera izni isteme fonksiyonu
   */
  const requestCameraPermission = async () => {
    try {
      console.log('🎥 Kamera izni isteniyor...');
      setCameraStatus('Kamera izni isteniyor...');
      setShowPermissionDialog(true);
      
      // Kamera izni iste
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 640, 
          height: 480,
          facingMode: 'user' // Ön kamera
        } 
      });
      
      console.log('✅ Kamera izni verildi, stream alındı:', stream);
      
      // İzin verildi
      setCameraPermission('granted');
      setShowPermissionDialog(false);
      setCameraStatus('Kamera izni verildi ✓');
      
      // Test stream'ini kapat
      stream.getTracks().forEach(track => {
        console.log('🔄 Stream track kapatılıyor:', track);
        track.stop();
      });
      
      console.log('🚀 MediaPipe başlatılıyor...');
      // MediaPipe'ı başlat
      initMediaPipe();
      
    } catch (err) {
      console.error('❌ Kamera izni hatası:', err);
      setCameraPermission('denied');
      setShowPermissionDialog(false);
      
      if (err.name === 'NotAllowedError') {
        setCameraStatus('❌ Kamera izni reddedildi. Lütfen tarayıcı ayarlarından kamera erişimini etkinleştirin.');
      } else if (err.name === 'NotFoundError') {
        setCameraStatus('❌ Kamera bulunamadı. Cihazınızda kamera olduğundan emin olun.');
      } else if (err.name === 'NotSupportedError') {
        setCameraStatus('❌ HTTPS gerekli. Lütfen https:// ile erişin.');
      } else {
        setCameraStatus(`❌ Kamera hatası: ${err.message}`);
      }
    }
  };

  /**
   * MediaPipe başlatma fonksiyonu
   */
  const initMediaPipe = async () => {
    try {
      console.log('🤖 MediaPipe başlatılıyor...');
      
      // Tarayıcı kamera desteği kontrolü
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tarayıcı kamera erişimini desteklemiyor');
      }

      setCameraStatus('MediaPipe başlatılıyor...');

      // MediaPipe Hands kurulumu
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      
      console.log('👋 MediaPipe Hands oluşturuldu');
      
      // El takibi ayarları
      hands.setOptions({ 
        maxNumHands: 1,              // Maksimum 1 el takip et
        modelComplexity: 1,          // Model karmaşıklığı (0=hızlı, 1=orta, 2=yavaş ama doğru)
        minDetectionConfidence: 0.2, // Minimum tespit güven eşiği (düşük = daha hassas)
        minTrackingConfidence: 0.2   // Minimum takip güven eşiği
      });
      
      console.log('⚙️ MediaPipe ayarları yapıldı');
      
      /**
       * El takibi sonuçlarını işleme fonksiyonu
       * Her frame'de MediaPipe tarafından çağrılır
       */
      hands.onResults(res => {
        // El tespit edildi mi kontrol et
        if (res && res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
          const landmarks = res.multiHandLandmarks[0]; // İlk elin landmark'ları (21 nokta)
          
          // Landmark'ların geçerli olduğunu kontrol et
          if (landmarks && landmarks.length > 8) {
            const indexFinger = landmarks[8]; // İşaret parmağı ucu (landmark #8)
            
            // Koordinatların geçerli olduğunu kontrol et
            if (indexFinger && 
                typeof indexFinger.x === 'number' && 
                typeof indexFinger.y === 'number' &&
                !isNaN(indexFinger.x) && 
                !isNaN(indexFinger.y)) {
              
              // El pozisyonunu güncelle (MediaPipe koordinatları: 0-1 arası)
              setHandPos({ x: indexFinger.x, y: indexFinger.y });
              setHandDetected(true);
              setCameraStatus('El tespit edildi ✓');
              
              // Parmak kıstırma hareketi tespiti (zoom kontrolü için)
              if (landmarks.length > 4) {
                const thumb = landmarks[4];  // Başparmak ucu
                const index = landmarks[8];  // İşaret parmağı ucu
                
                if (thumb && index && 
                    typeof thumb.x === 'number' && typeof thumb.y === 'number' &&
                    typeof index.x === 'number' && typeof index.y === 'number') {
                  
                  // İki parmak arası Öklid mesafesi
                  const pinchDistance = Math.sqrt(
                    Math.pow(thumb.x - index.x, 2) + 
                    Math.pow(thumb.y - index.y, 2)
                  );
                  
                  // Önceki mesafe varsa zoom hesapla
                  if (previousPinchDistance.current !== null) {
                    const delta = previousPinchDistance.current - pinchDistance;
                    // Anlamlı değişiklik varsa zoom uygula
                    if (Math.abs(delta) > 0.015) {
                      setZoom(prev => {
                        const newZoom = prev + delta * 40; // Hassasiyet çarpanı
                        return Math.max(5, Math.min(30, newZoom)); // 5-30 arası sınırla
                      });
                    }
                  }
                  previousPinchDistance.current = pinchDistance;
                }
              }
              
              // El hareketi ile rotasyon kontrolü
              if (previousHandX.current !== null) {
                const deltaX = indexFinger.x - previousHandX.current;
                // Anlamlı yatay hareket varsa rotasyon uygula
                if (Math.abs(deltaX) > 0.005) {
                  setRotationAngle(prev => {
                    // Yön tersine çevrildi: el sağa gidince obje sola dönsün
                    const newAngle = prev + deltaX * 2; // Pozitif işaret ile ters yön
                    return newAngle; // Sınırsız rotasyon
                  });
                }
              }
              previousHandX.current = indexFinger.x;
            }
          }
        } else {
          // El tespit edilmedi - durumu sıfırla
          setHandPos(null);
          setHandDetected(false);
          setCameraStatus('Kamera aktif - elinizi gösterin');
          previousPinchDistance.current = null;
          previousHandX.current = null;
        }
      });

      // Video elementi hazırsa kamerayı başlat
      if (videoRef.current) {
        console.log('📹 Video elementi hazır, kamera başlatılıyor...');
        setCameraStatus('Kamera başlatılıyor...');
        
        try {
          // MediaPipe Camera kurulumu
          const camera = new window.Camera(videoRef.current, {
            /**
             * Her video frame'inde çalışan fonksiyon
             */
            onFrame: async () => {
              try {
                // Video hazır ve geçerli boyutlarda mı kontrol et
                if (videoRef.current && 
                    videoRef.current.readyState === 4 && 
                    videoRef.current.videoWidth > 0 &&
                    videoRef.current.videoHeight > 0) {
                  // Frame'i MediaPipe'a gönder (el tespiti için)
                  await hands.send({ image: videoRef.current });
                }
              } catch (err) {
                console.error('Frame işleme hatası:', err);
              }
            },
            width: 640,  // Kamera çözünürlüğü genişlik
            height: 480  // Kamera çözünürlüğü yükseklik
          });
          
          console.log('🎬 MediaPipe Camera oluşturuldu, başlatılıyor...');
          camera.start(); // Kamerayı başlat
          console.log('✅ Kamera başlatıldı!');
          setCameraStatus('Kamera bağlandı - elinizi gösterin');
        } catch (err) {
          console.error('❌ Kamera başlatma hatası:', err);
          setCameraStatus(`Kamera başlatma hatası: ${err.message}`);
        }
      } else {
        console.error('❌ Video elementi bulunamadı!');
        setCameraStatus('Video elementi bulunamadı');
      }
    } catch (err) {
      console.error('MediaPipe başlatma hatası:', err);
      setCameraStatus(`Hata: ${err.message}`);
    }
  };

  /**
   * Kamera ve el takibi kurulum effect'i
   * Bileşen mount olduğunda çalışır ve MediaPipe el takibini başlatır
   */
  useEffect(() => {
    // MediaPipe Camera Utils'in yüklenip yüklenmediğini kontrol et
    if (typeof window.Camera === 'undefined') {
      setCameraStatus('Hata: MediaPipe Camera Utils yüklenmedi');
      console.error('MediaPipe Camera Utils yüklenmedi. index.html dosyasını kontrol edin');
      return;
    }

    // Kamera izni durumunu kontrol et
    if (cameraPermission === 'pending') {
      setCameraStatus('Kamera erişimi için izin gerekli');
    } else if (cameraPermission === 'granted') {
      initMediaPipe();
    }

    /**
     * Cleanup fonksiyonu - bileşen unmount olduğunda çalışır
     */
    return () => {
      // Video stream'ini durdur
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraPermission]); // cameraPermission değiştiğinde yeniden çalış

  /**
   * Mouse wheel ile zoom kontrolü
   * @param {WheelEvent} e - Mouse wheel event'i
   */
  const handleWheel = (e) => {
    e.preventDefault(); // Sayfa scroll'unu engelle
    setZoom(prev => {
      const delta = e.deltaY > 0 ? 1.5 : -1.5; // Wheel yönüne göre zoom değeri
      const newZoom = prev + delta;
      return Math.max(5, Math.min(30, newZoom)); // 5-30 arası sınırla
    });
  };

  return (
    <div 
      style={{ width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }}
      onWheel={handleWheel}
    >
      {/* Kamera İzni Dialog'u */}
      {(cameraPermission === 'pending' || showPermissionDialog) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          flexDirection: 'column',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px',
            padding: '40px',
            textAlign: 'center',
            maxWidth: '500px',
            width: '100%',
            border: '2px solid rgba(255,255,255,0.2)'
          }}>
            <div style={{
              fontSize: '60px',
              marginBottom: '20px'
            }}>📷</div>
            
            <h2 style={{
              color: '#fff',
              marginBottom: '20px',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              Kamera Erişimi Gerekli
            </h2>
            
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              marginBottom: '30px',
              fontSize: '16px',
              lineHeight: '1.5'
            }}>
              Bu uygulama el takibi için kameranızı kullanır. 
              Parçacıklarla etkileşime geçmek için kamera erişimine izin verin.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={requestCameraPermission}
                style={{
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  color: '#fff',
                  border: 'none',
                  padding: '15px 30px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)'
                }}
                onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
              >
                📷 Kameraya İzin Ver
              </button>
              
              {cameraPermission === 'denied' && (
                <button
                  onClick={() => {
                    setCameraPermission('pending');
                    setCameraStatus('Kamera erişimi için izin gerekli');
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    border: '2px solid rgba(255,255,255,0.3)',
                    padding: '15px 30px',
                    borderRadius: '25px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                >
                  🔄 Tekrar Dene
                </button>
              )}
            </div>
            
            {showPermissionDialog && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                background: 'rgba(255,193,7,0.2)',
                borderRadius: '10px',
                border: '1px solid rgba(255,193,7,0.5)'
              }}>
                <p style={{
                  color: '#FFC107',
                  fontSize: '14px',
                  margin: 0
                }}>
                  ⏳ Tarayıcınızda kamera izni dialog'u açılacak. Lütfen "İzin Ver" seçeneğini tıklayın.
                </p>
              </div>
            )}
            
            {cameraPermission === 'denied' && (
              <div style={{
                marginTop: '20px',
                padding: '15px',
                background: 'rgba(244,67,54,0.2)',
                borderRadius: '10px',
                border: '1px solid rgba(244,67,54,0.5)'
              }}>
                <p style={{
                  color: '#f44336',
                  fontSize: '14px',
                  margin: '0 0 10px 0',
                  fontWeight: 'bold'
                }}>
                  ❌ Kamera erişimi reddedildi
                </p>
                <p style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '12px',
                  margin: 0,
                  lineHeight: '1.4'
                }}>
                  Tarayıcı ayarlarından kamera erişimini etkinleştirin veya sayfayı yenileyin.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      <video 
        ref={videoRef} 
        className="debug-video"
        style={{ 
          display: showDebugVideo ? 'block' : 'none',
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '200px',
          height: '150px',
          border: '2px solid #00ff00',
          borderRadius: '10px',
          zIndex: 1000,
          transform: 'scaleX(-1)' // Ayna efekti için yatay çevir
        }}
        autoPlay
        playsInline
        muted
      />
      
      <div className="controls-container" style={{ position: 'absolute', bottom: '60px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {[
          { key: 'SATURN', label: 'SATÜRN' },
          { key: 'HEART', label: 'KALP' },
          { key: 'SPHERE', label: 'KÜRE' }
        ].map(s => (
          <button key={s.key} onClick={() => setShape(s.key)} className="shape-button" style={{
            background: shape === s.key ? '#ffdf7e' : 'rgba(255,255,255,0.1)',
            color: shape === s.key ? '#000' : '#fff',
            border: 'none', padding: '10px 25px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s'
          }}>{s.label}</button>
        ))}
        
        {/* Zoom butonları */}
        <div className="zoom-controls" style={{ display: 'flex', gap: '5px', marginLeft: '20px' }}>
          <button 
            onClick={() => setZoom(prev => Math.max(5, prev - 2))}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
          >−</button>
          <button 
            onClick={() => setZoom(prev => Math.min(30, prev + 2))}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
          >+</button>
        </div>
        
        {/* Rotasyon butonları */}
        <div className="rotation-controls" style={{ display: 'flex', gap: '5px', marginLeft: '20px' }}>
          <button 
            onClick={() => setRotationAngle(prev => prev - 0.2)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
            title="Sola döndür"
          >↶</button>
          <button 
            onClick={() => setRotationAngle(prev => prev + 0.2)}
            style={{
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '20px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '18px'
            }}
            title="Sağa döndür"
          >↷</button>
        </div>
      </div>

      <Canvas camera={{ position: [0, 0, zoom], fov: 50 }}>
        <CameraController targetZoom={zoom} />
        <Particles handPos={handPos} shape={shape} rotationAngle={rotationAngle} />
      </Canvas>
      
      {/* El pozisyonunun görsel göstergesi (debug için) */}
      {handPos && handPos.x !== undefined && (
        <div style={{
          position: 'absolute',
          left: `${handPos.x * 100}%`,
          top: `${handPos.y * 100}%`,
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'rgba(0, 255, 0, 0.5)',
          border: '2px solid #00ff00',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          zIndex: 1000,
          transition: 'all 0.1s'
        }} />
      )}
      
      {/* Durum ve ipuçları */}
      <div className="status-panel" style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: 'rgba(255,255,255,0.9)',
        fontSize: '12px',
        fontFamily: 'sans-serif',
        background: 'rgba(0,0,0,0.7)',
        padding: '15px',
        borderRadius: '10px',
        border: handDetected ? '2px solid #00ff00' : '2px solid rgba(255,255,255,0.3)',
        maxWidth: '300px'
      }}>
        <div style={{ 
          marginBottom: '10px',
          color: handDetected ? '#00ff00' : (cameraPermission === 'denied' ? '#ff6b6b' : '#ffdf7e'),
          fontWeight: 'bold',
          fontSize: '14px'
        }}>
          {cameraPermission === 'pending' && '📷 Kamera izni bekleniyor...'}
          {cameraPermission === 'denied' && '❌ Kamera erişimi reddedildi'}
          {cameraPermission === 'granted' && (handDetected ? '✓ ' : '○ ') + cameraStatus}
        </div>
        {handPos && handPos.x !== undefined && (
          <div style={{ marginBottom: '5px', fontSize: '11px', color: '#00ff00' }}>
            Koordinatlar: X: {handPos.x.toFixed(3)}, Y: {handPos.y.toFixed(3)}
          </div>
        )}
        {handDetected && (
          <div style={{ 
            marginTop: '10px', 
            padding: '8px', 
            background: 'rgba(0,255,0,0.2)', 
            borderRadius: '5px',
            fontSize: '11px'
          }}>
            <div style={{ color: '#00ff00', fontWeight: 'bold', marginBottom: '5px' }}>
              El tespit edildi! Etkileşim için elinizi hareket ettirin
            </div>
          </div>
        )}
        <div style={{ marginTop: '10px', fontSize: '11px', opacity: 0.8 }}>
          <div>• Yakınlaştırmak için mouse tekerleğini veya +/- butonlarını kullanın</div>
          <div>• Yakınlaştırmak için başparmak ve işaret parmağınızı birbirine yaklaştırın</div>
          <div>• Uzaklaştırmak için parmaklarınızı açın</div>
          <div>• Döndürmek için elinizi sola/sağa hareket ettirin</div>
          <div>• Hassas döndürme için ↶ ↷ butonlarını kullanın</div>

          <div style={{ marginTop: '10px' }}>
            {cameraPermission === 'pending' && (
              <button
                onClick={requestCameraPermission}
                style={{
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 15px',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  display: 'block',
                  width: '100%'
                }}
              >
                📷 Kameraya İzin Ver
              </button>
            )}
            
            {cameraPermission === 'denied' && (
              <button
                onClick={() => {
                  setCameraPermission('pending');
                  setCameraStatus('Kamera erişimi için izin gerekli');
                }}
                style={{
                  background: 'rgba(255,193,7,0.3)',
                  color: '#FFC107',
                  border: '1px solid rgba(255,193,7,0.5)',
                  padding: '8px 15px',
                  borderRadius: '15px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  marginBottom: '10px',
                  display: 'block',
                  width: '100%'
                }}
              >
                🔄 Kamera İznini Tekrar İste
              </button>
            )}
            
            <button
              onClick={() => setShowDebugVideo(!showDebugVideo)}
              style={{
                background: showDebugVideo ? 'rgba(0,255,0,0.3)' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '5px 10px',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '10px'
              }}
            >
              {showDebugVideo ? 'Videoyu gizle' : 'Kamera videosunu göster'}
            </button>
          </div>
        </div>
      </div>

      {/* Logo ve link ile footer */}
      <div className="footer" style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: 0.7,
        transition: 'opacity 0.3s'
      }}
      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
      >
        <a 
          href="https://metinkpnk.github.io/PortfolioSayfam/" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '12px',
            fontFamily: 'sans-serif'
          }}
        >
          Geliştiren:
          <span>Metin KEPENEK Portfolio</span>
        </a>
      </div>
    </div>
  );
}