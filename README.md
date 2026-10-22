# Reservia — Çok işletmeli rezervasyon demosu

Otel, berber, kafe ve farklı işletmeler için hazırlanmış Türkçe, etkileşimli rezervasyon yönetimi prototipi. Framework veya derleme adımı gerektirmez; HTML, CSS ve JavaScript ile çalışır.

## Özellikler

- Demo giriş ve kayıt ekranları.
- İşletme seçimi ve yeni işletme ekleme.
- İşletmeye özel yönetim paneli ve örnek takvim.
- Rezervasyon oluşturma, arama, durum filtresi ve iptal.
- İşletme adı, tema rengi, çalışma günleri, saatleri, rezervasyon aralığı, slot süresi ve kapasite ayarları.
- Müşteri rezervasyon akışı önizlemesi.
- Tarayıcıda `localStorage` ile veri saklama.
- Mobil ekranlara uyumlu tasarım ve yerel görsel/yazı tipi dosyaları.

## Yerelde çalıştırma

Repo klasöründe:

```sh
python3 -m http.server 8080
```

Tarayıcıda `http://localhost:8080` adresini açın. Node.js, paket kurulumu ve API anahtarı gerekmez.

## Demo akışı

Uygulama incelemeyi kolaylaştırmak için demo oturumuyla işletme seçim ekranında açılır. Sağ üstteki **Giriş / Kayıt** düğmesiyle hesap akışını deneyebilirsiniz. Bir işletmenin **Yönetim paneline git** düğmesine basın; ardından **Rezervasyonlar** veya **Özelleştirme** sekmelerini kullanın.

Örnek takvim 22 Ekim 2026 tarihini esas alır. Rezervasyon kontrolleri bu demo tarihi, seçili çalışma günleri, saatler ve kapasite üzerinden çalışır.

## Dosyalar

```text
index.html   Sayfa iskeleti
styles.css   Masaüstü ve mobil stiller, yerel font tanımları
app.js       Demo verisi, etkileşimler ve tarayıcı içi saklama
assets/      İşletme fotoğrafları ve font dosyaları
```

## Önemli sınırlar

Bu bir ürün demosudur, üretim uygulaması değildir. Gerçek kimlik doğrulama, sunucu, veritabanı, ödeme, e-posta/SMS veya işletmeye rezervasyon iletimi içermez. Şifreler saklanmaz. Veriler yalnızca kullanılan tarayıcıda tutulur; cihazlar veya kullanıcılar arasında paylaşılmaz. Gerçek kişisel veri girmeyin.

Demo verilerini sıfırlamak için tarayıcı site verilerini temizleyin veya geliştirici konsolunda şunu çalıştırıp sayfayı yenileyin:

```js
localStorage.removeItem('reservia-demo-v1');
location.reload();
```

Görseller prototip amaçlıdır; ticari kullanımdan önce görsel ve font lisanslarını doğrulayın.

## Mevcut canlı demo

https://reservia-can-demo.screeching-bellflower-1d5.workers.dev

Bu repo mevcut yayından bağımsızdır. Otomatik yayınlama veya CI/CD kurulmamıştır; repoya gönderim yapmak mevcut canlı yayını değiştirmez. Canlı demo geçici bir yayın olarak hazırlanmıştır.
