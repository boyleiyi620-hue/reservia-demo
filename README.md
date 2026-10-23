# Reservia — Çok işletmeli rezervasyon demosu

Otel, berber, kafe ve benzeri işletmeler için hazırlanmış Türkçe, etkileşimli rezervasyon yönetimi prototipi. Framework veya derleme adımı gerektirmez; HTML, CSS ve JavaScript ile çalışır.

**Canlı demo:** https://boyleiyi620-hue.github.io/reservia-demo/

## Özellikler

### Yönetim tarafı
- Demo giriş/kayıt ekranları ve çalışma alanı.
- İşletme seçimi, yeni işletme ekleme (türe göre otomatik ayar ve görsel).
- **Genel bakış:** bugünün rezervasyonları, 7 günlük özet, onay bekleyenler ve aylık doluluk oranı.
- **Takvim:** ay gezinme, gün bazlı rezervasyon sayıları, güne tıklayınca o günün programı, hızlı rezervasyon ekleme.
- **Rezervasyonlar:** metin arama, durum/tarih filtresi, sıralama; tek tıkla onaylama, beklemeye alma, iptal ve silme — tümü **Geri al** destekli.
- **Özelleştirme:** işletme adı, tema rengi, rezervasyon aralığı, çalışma saatleri ve günleri, slot süresi, kapasite ve hizmet listesi.
- Canlı müşteri önizlemesi.

### Müşteri tarafı
- 3 adımlı rezervasyon akışı: hizmet ve kişi sayısı → tarih ve saat → iletişim bilgileri.
- Yalnızca gerçekten uygun saatler seçilebilir; dolu slotlar ve kapalı günler otomatik devre dışı kalır.
- Rezervasyon kodu ile onay ekranı; oluşturulan talep yönetim panelinde "Bekliyor" olarak görünür.

### Genel
- Açık/koyu tema (sistem tercihine saygı duyar, seçim hatırlanır).
- Veri yedekleme (JSON indir), geri yükleme ve demoyu sıfırlama.
- `localStorage` ile tarayıcıda kalıcılık; sunucu veya API gerekmez.
- Mobil uyumlu tasarım, yerel font ve görseller, klavye ile kullanılabilir modallar.

## Yerelde çalıştırma

Repo klasöründe herhangi bir statik sunucu yeterlidir:

```sh
python3 -m http.server 8080
# veya
npx serve .
```

Ardından `http://localhost:8080` adresini açın. Node.js kurulumu ve API anahtarı gerekmez.

## Demo akışı

1. **İşletmelerim** ekranından bir işletme seçin (ör. Mysa Boutique Hotel).
2. **Genel bakış** ekranında günün özetini ve takvimi inceleyin.
3. **Rezervasyonlar** ekranında bekleyen bir kaydı onaylayın veya iptal edin.
4. **Müşteri görünümü** düğmesiyle müşteri rezervasyon akışını baştan sona deneyin.
5. **Özelleştirme** ekranından çalışma saatlerini ve hizmetleri değiştirip takvimin nasıl güncellendiğini görün.

Tüm veriler demo tarihine (bugün) göre üretilir; takvim ve rezervasyon aralıkları buna göre hesaplanır.

## Dosyalar

```text
index.html   Sayfa iskeleti ve gezinme
styles.css   Masaüstü/mobil stiller, koyu tema, yerel font tanımları
app.js       Demo verisi, takvim, rezervasyon akışı ve tarayıcı içi saklama
assets/      İşletme fotoğrafları ve font dosyaları
```

## Sınırlar

Bu bir ürün demosudur, üretim uygulaması değildir. Gerçek kimlik doğrulama, sunucu, veritabanı, ödeme, e-posta/SMS gönderimi veya işletmeye rezervasyon iletimi içermez. Şifreler saklanmaz. Veriler yalnızca kullanılan tarayıcıda tutulur; cihazlar veya kullanıcılar arasında paylaşılmaz. Gerçek kişisel veri girmeyin.

Demo verilerini sıfırlamak için **Özelleştirme → Veri → Sıfırla** yolunu kullanabilir veya tarayıcı konsolunda:

```js
localStorage.removeItem('reservia-demo-v2');
location.reload();
```

Görseller prototip amaçlıdır; ticari kullanımdan önce görsel ve font lisanslarını doğrulayın.
