import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

const upload = multer({ dest: path.join(process.cwd(), "uploads") });

app.get("/", (req, res) => {
  res.render("form");
});

app.post(
  "/gerar",
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "hero", maxCount: 1 },
    { name: "img1", maxCount: 1 },
    { name: "img2", maxCount: 1 },
    { name: "img3", maxCount: 1 },
  ]),
  (req, res) => {
    const {
      nome,
      cor,
      whatsapp,
      instagram,
      facebook,
      endereco,
      businessHours,
      descricao,
      mapsUrl,
      mapsEmbed,
      oferecemos1,
      oferecemos2,
      oferecemos3,
      publico1,
      publico2,
      publico3,
    } = req.body;

    // Validação para cor hexadecimal
    if (!/^#?([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$/.test(cor)) {
      return res.send(
        "Erro: O valor da cor deve ser um hexadecimal válido (ex: #FF0000)."
      );
    }

    // Ajuste do valor da cor hexadecimal
    let processedCor = cor;
    if (cor && !cor.startsWith("#")) {
      processedCor = `#${cor}`;
    }

    // Validação e ajuste do número de WhatsApp
    let processedWhatsapp = whatsapp;
    if (whatsapp) {
      if (/^\d{8,}$/.test(whatsapp)) {
        // Adiciona +55 se o número não começar com 55
        if (!whatsapp.startsWith("55")) {
          processedWhatsapp = `55${whatsapp}`;
        }
      } else if (/^\+55\d{8,}$/.test(whatsapp)) {
        // Remove o sinal de +
        processedWhatsapp = whatsapp.replace("+", "");
      } else {
        return res.send(
          "Erro: O número de WhatsApp está incompleto ou inválido."
        );
      }
    }

    // Processa o campo mapsEmbed: se preenchido com tag iframe, extrai a URL do atributo src.
    let embedUrl = "";
    if (mapsEmbed) {
      if (mapsEmbed.includes("<iframe")) {
        const match = mapsEmbed.match(/src\s*=\s*["']([^"']+)['"]/);
        if (match) {
          embedUrl = match[1];
        }
      } else {
        embedUrl = mapsEmbed;
      }
    }
    // mapsUrl já vem pronto para os botões

    // Pasta destino
    const pasta = path.join(
      __dirname,
      "..",
      nome.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase()
    );
    fs.mkdirSync(pasta, { recursive: true });

    // Copiar imagens
    const imagens = {};
    ["profile", "hero", "img1", "img2", "img3"].forEach((campo) => {
      if (req.files[campo]) {
        const dest = path.join(pasta, req.files[campo][0].originalname);
        fs.copyFileSync(req.files[campo][0].path, dest);
        imagens[campo] = req.files[campo][0].originalname;
      }
    });

    // Gerar index.html
    const html = renderTemplate({
      nome,
      cor: processedCor, // usa a cor ajustada
      whatsapp: processedWhatsapp, // usa o número ajustado
      instagram,
      facebook,
      endereco,
      maps: embedUrl, // usa a url embed para o iframe
      mapsUrl, // url original para os botões
      businessHours,
      imagens,
      descricao,
      oferecemos1,
      oferecemos2,
      oferecemos3,
      publico1,
      publico2,
      publico3,
    });
    fs.writeFileSync(path.join(pasta, "index.html"), html);

    // Adiciona o novo site ao sitemap.xml
    const sitemapPath = path.join(__dirname, "..", "sitemap.xml");
    let sitemapContent = fs.readFileSync(sitemapPath, "utf8");
    const urlName = nome.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
    const newUrl = `    <url>\n        <loc>https://www.cartaovisitadigital.com/${urlName}/</loc>\n        <lastmod>${new Date()
      .toISOString()
      .slice(
        0,
        10
      )}</lastmod>\n        <changefreq>weekly</changefreq>\n        <priority>0.8</priority>\n    </url>\n`;
    sitemapContent = sitemapContent.replace(/<\/urlset>/, `${newUrl}</urlset>`);
    fs.writeFileSync(sitemapPath, sitemapContent);

    res.send(`<h2>Site gerado em: ${pasta}</h2><a href="/">Voltar</a>`);
  }
);

function renderTemplate({
  nome = "",
  cor = "#1a4770",
  whatsapp = "",
  instagram = "",
  facebook = "",
  endereco = "",
  maps = "",
  mapsUrl = "",
  businessHours = "",
  imagens = {},
  descricao = "",
  oferecemos1 = "",
  oferecemos2 = "",
  oferecemos3 = "",
  publico1 = "",
  publico2 = "",
  publico3 = "",
}) {
  function buildSameAs({ mapsUrl, instagram, whatsapp, facebook }) {
  const links = [];

  if (mapsUrl) {
    links.push(mapsUrl);
  }

  if (instagram) {
    // Garante que já é URL ou monta
    links.push(
      instagram.startsWith("http")
        ? instagram
        : `https://instagram.com/${instagram.replace(/^@/, "")}`
    );
  }

  if (whatsapp) {
    // Remove caracteres não numéricos, para não quebrar o wa.me
    const cleanPhone = whatsapp.replace(/\D/g, "");
    if (cleanPhone) {
      links.push(`https://wa.me/${cleanPhone}`);
    }
  }

  if (facebook) {
    links.push(
      facebook.startsWith("http")
        ? facebook
        : `https://facebook.com/${facebook.replace(/^@/, "")}`
    );
  }

  return links;
}


  function splitPair(text) {
    if (!text) return ["", ""];
    // aceita hífen normal e variações de dash
    const parts = text.split(/[-–—]/);
    if (parts.length === 1) {
      // sem separador: tudo vira título
      return [parts[0].trim(), ""];
    }
    // junta tudo após o primeiro separador como descrição (caso haja mais de um)
    const title = parts.shift().trim();
    const desc = parts.join("-").trim();
    return [title, desc];
  }

  function parseBusinessHours(businessHours) {
  if (!businessHours) return null;

  const diasMap = {
    seg: "Mo",
    segunda: "Mo",
    ter: "Tu",
    terça: "Tu",
    terca: "Tu",
    qua: "We",
    quarta: "We",
    qui: "Th",
    quinta: "Th",
    sex: "Fr",
    sexta: "Fr",
    sab: "Sa",
    sábado: "Sa",
    sabado: "Sa",
    dom: "Su",
    domingo: "Su"
  };

  try {
    const blocks = businessHours.split("|"); // separa "Seg a Ter e Qui a Dom: 18h–23h"  | "Qua: Fechado"
    let result = [];

    for (const block of blocks) {
      const lower = block.toLowerCase().trim();

      // captura horário (pode ter hífen normal ou "–")
      const horasMatch = lower.match(/(\d{1,2})h.*?(\d{1,2})h/);
      const horas = horasMatch
        ? [
            horasMatch[1].padStart(2, "0") + ":00",
            horasMatch[2].padStart(2, "0") + ":00"
          ]
        : null;

      // captura dias (aceita "Seg a Ter", "Qui a Dom", ou "Qua")
      const diasMatch = lower.match(
        /(seg|segunda|ter|terça|terca|qua|quarta|qui|quinta|sex|sexta|sab|sábado|sabado|dom|domingo)(\s*a\s*(seg|segunda|ter|terça|terca|qua|quarta|qui|quinta|sex|sexta|sab|sábado|sabado|dom|domingo))?/g
      );

      if (!diasMatch) continue;

      for (const d of diasMatch) {
        const parts = d.split("a").map(x => x.trim());
        const d1 = diasMap[parts[0]];
        const d2 = parts[1] ? diasMap[parts[1]] : null;

        if (lower.includes("fechado")) {
          // marca como fechado
          result.push(`${d1}${d2 ? "-" + d2 : ""} Closed`);
        } else if (horas) {
          result.push(
            `${d1}${d2 ? "-" + d2 : ""} ${horas[0]}-${horas[1]}`
          );
        }
      }
    }

    return result.length > 0 ? result : null;
  } catch (e) {
    return null;
  }
}

  const [off1Title, off1Desc] = splitPair(oferecemos1);
  const [off2Title, off2Desc] = splitPair(oferecemos2);
  const [off3Title, off3Desc] = splitPair(oferecemos3);

  const [pub1Title, pub1Desc] = splitPair(publico1);
  const [pub2Title, pub2Desc] = splitPair(publico2);
  const [pub3Title, pub3Desc] = splitPair(publico3);
  const parsedHours = parseBusinessHours(businessHours);

  return `<!DOCTYPE html>
<html lang="pt-br">
  <head>
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2727171811005381" crossorigin="anonymous"></script>
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-R5NWFWRWJ1"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', 'G-R5NWFWRWJ1');
    </script>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- SEO -->
    <title>${nome}</title>
    <meta name="description" content="${descricao.replace(/"/g, '&quot;')}" />
    <link rel="canonical" href="https://www.cartaovisitadigital.com/${nome.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase()}/" />

    <!-- Open Graph (Facebook, WhatsApp, LinkedIn) -->
    <meta property="og:title" content="${nome}" />
    <meta property="og:description" content="${descricao.replace(/"/g, '&quot;')}" />
    <meta property="og:image" content="${imagens.profile}" />
    <meta property="og:url" content="https://www.cartaovisitadigital.com/${nome.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase()}/" />
    <meta property="og:type" content="website" />
  
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${nome}" />
    <meta name="twitter:description" content="${descricao.replace(/"/g, '&quot;')}" />
    <meta name="twitter:image" content="${imagens.profile}" />

    <!-- Schema.org LocalBusiness -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "${nome}",
      "description": "${descricao.replace(/"/g, '\\"')}",
      "image": "${imagens.profile}",
      "url": "https://www.cartaovisitadigital.com/${nome.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase()}/",
      "telephone": "${whatsapp || ''}",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "${endereco || ''}",
        "addressCountry": "BR"
      },
      "openingHours": ${parsedHours ? JSON.stringify(parsedHours) : '""'},
      "hasMap": "${mapsUrl || ''}",
      "sameAs": ${JSON.stringify(
        buildSameAs({ mapsUrl, instagram, whatsapp, facebook })
      )}
    }
    </script>

  
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet" />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Poppins:wght@400;500&display=swap" rel="stylesheet" />
    <style>
      :root { --primary: ${cor}; --text: #333; }
      body { margin: 0; font-family: 'Poppins', sans-serif; color: var(--text); }
      header { background: var(--primary); padding: 20px; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 1000; }
      .header-left { display: flex; align-items: center; gap: 15px; }
      .header-left img { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; }
      header h1 { font-family: 'Playfair Display', serif; margin: 0; font-size: 1.5rem; color: #fff; }
      header .links a { margin-left: 15px; color: #fff; text-decoration: none; font-size: 1.2rem; }
      .hero { height: 400px; overflow: hidden; }
      .hero img { width: 100%; height: 100%; object-fit: cover; }
      .section { padding: 50px 20px; max-width: 1000px; margin: auto; }
      .section h3 { text-align: center; margin-bottom: 30px; font-size: 1.8rem; color: var(--primary); }
      .cards { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; }
      .card { background: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 20px; width: 280px; text-align: center; }
      .card i { font-size: 2rem; color: var(--primary); margin-bottom: 10px; }
      .photos { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; }
      .photo { flex: 1 1 300px; max-width: 300px; border-radius: 8px; overflow: hidden; }
      .photo img { width: 100%; height: 200px; object-fit: cover; display: block; cursor: pointer; }
      footer { background: var(--primary); color: #fff; text-align: center; padding: 2rem 1rem 1.2rem 1rem; margin-top: 2.5rem; font-size: 1.05rem; display: flex; flex-direction: row; align-items: center; justify-content: space-between; }
      footer a { color: #fff; text-decoration: underline; }
      @media (max-width: 600px) { footer { flex-direction: column !important; align-items: center !important; } footer img { margin-bottom: 1rem !important; } footer div:last-child { display: none; } }
    </style>
  </head>
  <body>
    <header>
      <div class="header-left">
        <img src="${imagens.profile || ""}" alt="Logo" />
        <h1>${nome}</h1>
      </div>
      <div class="links">
        <a href="https://wa.me/${whatsapp}"><i class="bi bi-whatsapp"></i></a>
        <a href="https://instagram.com/${instagram}"><i class="bi bi-instagram"></i></a>        
        ${
          facebook
            ? `<a  href="${
                facebook.startsWith("http")
                  ? facebook
                  : `https://facebook.com/${facebook}`
              }"><i class="bi bi-facebook"></i></a>`
            : ""
        }
        <a href="${
          mapsUrl ? mapsUrl : "#"
        }" target="_blank" title="Localização"><i class="bi bi-geo-alt"></i></a>
      </div>
    </header>
    <section class="hero">
      <img src="${imagens.hero || ""}" alt="Hero Image" />
    </section>
    <section class="section">
      <h3>Sobre ${nome}</h3>
      <p style="text-align: center">${
        descricao || "Descrição personalizada aqui."
      }</p>
    </section>

${ (off1Title || off2Title || off3Title) ? `
    <section class="section" id="oferecemos">
      <h3>O que oferecemos</h3>
      <div class="cards" role="list">
        <div class="card" role="listitem">
          <h4>${off1Title}</h4>
          <p>${off1Desc}</p>
        </div>
        <div class="card" role="listitem">
          <h4>${off2Title}</h4>
          <p>${off2Desc}</p>
        </div>
        <div class="card" role="listitem">
          <h4>${off3Title}</h4>
          <p>${off3Desc}</p>
        </div>
      </div>
    </section>
` : ''}

${ (pub1Title || pub2Title || pub3Title) ? `
    <section class="section" id="para-quem">
      <h3>Para quem é</h3>
      <div class="cards" role="list">
        <div class="card" role="listitem">
          <h4>${pub1Title}</h4>
          <p>${pub1Desc}</p>
        </div>
        <div class="card" role="listitem">
          <h4>${pub2Title}</h4>
          <p>${pub2Desc}</p>
        </div>
        <div class="card" role="listitem">
          <h4>${pub3Title}</h4>
          <p>${pub3Desc}</p>
        </div>
      </div>
    </section>
` : ''}
    
     <section class="section">
      <h3>Horário de Funcionamento</h3>
      <p style="text-align: center">${businessHours || "Não informado"}</p>
    </section>
    
${ (imagens.img1 || imagens.img2 || imagens.img3) ? `
  <section class="section">
      <h3>Fotos do Local</h3>
      <div class="photos">
        <div class="photo"><img src="${
          imagens.img1 || ""
        }" alt="Foto 1" onclick="openModal(this.src)" /></div>
        <div class="photo"><img src="${
          imagens.img2 || ""
        }" alt="Foto 2" onclick="openModal(this.src)" /></div>
        <div class="photo"><img src="${
          imagens.img3 || ""
        }" alt="Foto 3" onclick="openModal(this.src)" /></div>
      </div>
    </section>
` : ''}
    
    <section class="section">
      <h3>Contato</h3>
      <div class="cards">
        ${
          whatsapp
            ? `<a class="card" href="https://wa.me/${whatsapp}" style="text-decoration:none;"><i class="bi bi-whatsapp"></i><h4 style="color:var(--primary);">Whatsapp</h4></a>`
            : ""
        }
        ${
          instagram
            ? `<a class="card" href="https://instagram.com/${instagram}" style="text-decoration:none;"><i class="bi bi-instagram"></i><h4 style="color:var(--primary);">Instagram</h4></a>`
            : ""
        }
        ${
          facebook
            ? `<a class="card" href="${
                facebook.startsWith("http")
                  ? facebook
                  : `https://facebook.com/${facebook}`
              }" style="text-decoration:none;" target="_blank"><i class="bi bi-facebook"></i><h4 style="color:var(--primary);">Facebook</h4></a>`
            : ""
        }
        ${
          mapsUrl
            ? `<a class="card" href="${mapsUrl}" target="_blank" style="text-decoration:none;"><i class="bi bi-geo-alt"></i><h4 style="color:var(--primary);">Localização</h4></a>`
            : ""
        }
      </div>
    </section>

    <section class="section">
      <h3>Localização</h3>
      <p style="text-align: center">${endereco}</p>
      ${
        maps
          ? `<iframe src="${maps}" width="600" height="450" style="border:0; width: 100%; height: 300px; border-radius: 10px;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
          : ""
      }
    </section>

    <section class="section">
      <div class="adsense-container">
        <!-- AdSense -->
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2727171811005381" crossorigin="anonymous"></script>
        <ins class="adsbygoogle" style="display: block" data-ad-client="ca-pub-2727171811005381" data-ad-slot="4151101568" data-ad-format="auto" data-full-width-responsive="true"></ins>
        <script>
          (adsbygoogle = window.adsbygoogle || []).push({});
        </script>
      </div>
    </section>
    <div id="modalZoom" style="display: none; position: fixed; z-index: 9999; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); justify-content: center; align-items: center;">
      <span onclick="closeModal()" style="position: absolute; top: 30px; right: 40px; font-size: 2.5rem; color: #fff; cursor: pointer; font-family: sans-serif;">&times;</span>
      <img id="modalImg" src="" style="max-width: 90vw; max-height: 80vh; border-radius: 12px; box-shadow: 0 2px 20px #000;" />
    </div>
    <script>
      function openModal(src) { document.getElementById('modalImg').src = src; document.getElementById('modalZoom').style.display = 'flex'; }
      function closeModal() { document.getElementById('modalZoom').style.display = 'none'; document.getElementById('modalImg').src = ''; }
      document.getElementById('modalZoom').addEventListener('click', function(e) { if (e.target === this) closeModal(); });
      document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });
    </script>
    <footer>
      <a href="../index.html"><img src="../assets/logo_recortada_1500.png" alt="Logo" style="max-width: 140px" /></a>
      <div style="text-align: center">© Cartão de Visita Digital.<br />Todos os direitos reservados.</div>
      <div style="width: 140px"></div>
    </footer>
  </body>
</html>`;
}

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
