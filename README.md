# Reservia — çevrimiçi randevu yönetimi

Türkçe arayüzlü, çok işletmeli randevu uygulaması. İşletme sahipleri hesap açıp işletmelerini yönetebilir; yayımlanan müşteri bağlantısı üzerinden müşteriler uygun saatleri görerek randevu isteği gönderebilir. Dolu saatler veritabanında kontrol edilir ve işletme panelindeki takvim ile genel bakışta görünür. Yeni **Sayfa düzenleyici** bölümünde işletme logosu, kapak ve galeri görselleri, tanıtım yazısı, iletişim bilgileri ve marka rengi düzenlenebilir; hizmet, çalışma saatleri ve kapasite ayarları randevu panelinde kalır.

**Canlı site:** https://boyleiyi620-hue.github.io/reservia-demo/

## Gerçek hesapları ve ortak veriyi etkinleştirme

Uygulama statik GitHub Pages üzerinde çalışır; kullanıcı hesapları ve cihazlar arasında paylaşılan veriler Supabase Auth ve Postgres kullanır. Aşağıdaki kurulum bir kez yapılmalıdır:

1. Supabase’te bir proje oluşturun.
2. Supabase SQL Editor’ü açıp [`supabase/schema.sql`](supabase/schema.sql) dosyasının tamamını çalıştırın. Bu şema işletmeleri, üyelikleri, çalışma saatlerini, hizmetleri, randevuları, sayfa profillerini, `business-media` görsel deposunu, erişim kurallarını ve çakışmayı engelleyen veritabanı işlevlerini kurar.
3. Supabase **Authentication → URL Configuration** bölümünde site URL’sini `https://boyleiyi620-hue.github.io/reservia-demo/` olarak ayarlayın. Gerekli yönlendirme adreslerine bu adresi ve yerel geliştirme için `http://localhost:8080/**` adresini ekleyin. E-posta/şifre ile kaydı etkinleştirin.
   **Authentication → Emails → SMTP Settings** bölümünde kendi SMTP hizmetinizi bağlayın ve e-posta doğrulamasını açık bırakın. [Supabase’in varsayılan SMTP hizmeti](https://supabase.com/docs/guides/auth/auth-smtp) yalnız kuruluş ekibindeki adreslere posta gönderir; herkese açık kayıt için uygun değildir. SMTP şifresini yalnız Supabase ayarlarında tutun, Git deposuna veya tarayıcı koduna eklemeyin.
4. Supabase proje URL’sini ve **publishable/anon** anahtarını `supabase-config.js` içindeki `url` ve `anonKey` alanlarına girin. Bu anahtar tarayıcıda kullanılmak üzere tasarlanmıştır. **`service_role` anahtarını bu dosyaya veya Git deposuna koymayın.** Satır düzeyi güvenlik (RLS) kuralları veri erişimini sınırlar.
5. Değişiklikleri `main` dalına gönderin; GitHub Pages sitenizi yayımlar. Sonra canlı bağlantıda kayıt ve müşteri randevu akışını deneyin.

Supabase URL/anahtarı girilmediğinde sayfa, sunucuya veri göndermeyen yerel demo modunda açılır. Gerçek hesap ve paylaşılmış randevu için Supabase yapılandırması ve şema kurulumu gerekir. Yeni işletmeler başlangıçta hafta içi 09.00–17.00 saatleri ve “Randevu” hizmetiyle açılır; işletme sahibi bunları panelde değiştirebilir. Rezervasyon bağlantısı `?business=işletme-slug` parametresini kullanır.

## Yerelde çalıştırma

Depo klasöründe statik bir sunucu başlatın:

```sh
python3 -m http.server 8080
```

Ardından `http://localhost:8080` adresini açın. Gerçek Supabase hesabı denemek için `supabase-config.js` içinde aynı proje URL/anon anahtarını kullanın ve Supabase yönlendirme adreslerine `http://localhost:8080/**` ekleyin.

## Teknoloji ve güvenlik

Arayüz HTML, CSS ve JavaScript’tir; derleme adımı gerekmez. `cloud-app.js` Supabase Auth oturumunu kullanır. İşletme üyeliği ve randevular RLS ile korunur. Müşteri sayfası yalnızca yayımlanmış işletme bilgilerini ve kişisel bilgi içermeyen uygun saat listesini okuyabilir. Profil düzenleme RPC’si ve medya deposu işletme sahipliğini denetler; görseller web için sıkıştırılır. Randevu oluşturma işlemi veritabanında kilitlenip kapasiteyi tekrar denetler; eşzamanlı istekler aynı yeri iki kez alamaz.

Randevular oluşturuldukları andaki süreyi saklar; işletme slot süresini değiştirse de mevcut randevularla çakışan yeni saatler kapalı kalır. Geçmiş saatlere randevu alınamaz. İptal edilmiş bir randevu yeniden etkinleştirilmez; gerekiyorsa yeni uygun saat seçilerek yeni randevu eklenir. Panel yalnız oturum sahibinin üyeliği olan işletmeleri yükler. Herkese açık uygunluk listesi 15 saniyede bir yenilenir; son kapasite kontrolü her zaman veritabanında yapılır.

Gerçek müşterilerin kişisel verilerini yalnızca kendi Supabase projenizde, gizlilik ve veri saklama yükümlülüklerinize uygun biçimde kullanın.
