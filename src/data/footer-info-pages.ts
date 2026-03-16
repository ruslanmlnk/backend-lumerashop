export type FooterInfoPageSeed = {
  globalSlug:
    | 'shipping-and-payment-page'
    | 'returns-and-complaints-page'
    | 'terms-and-conditions-page'
    | 'privacy-policy-page'
    | 'cookies-page'
  title: string
  heroImageUrl: string
  seoDescription: string
  contentHtml: string
}

export const footerInfoPageSeeds: FooterInfoPageSeed[] = [
  {
    globalSlug: 'shipping-and-payment-page',
    title: 'Doprava a platba',
    heroImageUrl: 'https://lumerashop.cz/wp-content/uploads/2025/11/doprava-platba-4.webp',
    seoDescription:
      'Informace o moznostech dopravy, zpusobech platby, dodacich podminkach a kontaktech pro nakup v Lumera.',
    contentHtml: `
      <p>Na teto strance najdete kompletni informace o moznostech dopravy a zpusobech platby v nasem e-shopu Lumera. Chceme, abyste objednavku dokoncili s prehledem a bez obav.</p>
      <h2>Zpusoby dopravy</h2>
      <p>Nabizime nekolik moznosti doruceni, abyste si mohli vybrat tu, ktera vam nejlepe vyhovuje. Vsechny ceny jsou uvedeny vcetne DPH a zobrazuji se v kosiku pred dokoncenim objednavky.</p>
      <ul>
        <li><strong>Kuryrni doruceni na adresu</strong> - obvykle 1-3 pracovni dny po expedici, sledovani zasilky je v cene zahrnuto.</li>
        <li><strong>Vydejni mista / vydejni boxy</strong> - pohodlne vyzvednuti v siti partneru, cena nizsi nez doruceni na adresu.</li>
        <li><strong>Osobni odber</strong> - zdarma, pokud si zbozi vyzvednete u nas po domluve.</li>
      </ul>
      <p>Pokud hodnota objednavky presahne <strong>1 500 Kc</strong>, automaticky ziskavate dopravu zdarma.</p>
      <h2>Zpusoby platby</h2>
      <p>Pri platbe za vase nove kozene doplnky muzete zvolit jednu z nabizenych metod:</p>
      <ul>
        <li><strong>Online platba kartou nebo Apple Pay / Google Pay</strong> - platba probehne okamzite a objednavka je ihned potvrzena.</li>
        <li><strong>Prevodem na ucet</strong> - po dokonceni objednavky obdrzite platebni udaje e-mailem, platbu uhradte do 10 dni.</li>
        <li><strong>Dobirkou pri doruceni</strong> - platite kuryrovi pri prevzeti zasilky. U nekterych zpusobu muze byt uctovan doplatek.</li>
      </ul>
      <p>Po zaplaceni nebo potvrzeni platby zahajime expedici vaseho zbozi.</p>
      <h2>Terminy a dodaci podminky</h2>
      <p>Expedice probiha bezne 1-2 pracovni dny po potvrzeni objednavky a platby.<br />Doba doruceni zavisi na vybrane metode a muze se prodlouzit pri vyprodeji, svatcich nebo pri vyssim objemu objednavek. Zbozi je odeslano v bezpecnem baleni, aby vase nove modely z Italie dorazily v perfektnim stavu.</p>
      <h2>Naklady na dopravu a platbu zdarma</h2>
      <p>Ziskejte dopravu zdarma, kdyz hodnota vasi objednavky dosahne nebo prekroci <strong>1 500 Kc</strong>. Platene zpusoby dopravy se zobrazi v kosiku jeste pred tim, nez objednavku dokoncite, takze vzdy vidite konecnou cenu.</p>
      <p>Mate-li jakoukoli otazku ohledne dopravy ci platby, kontaktujte nas zakaznicky servis na e-mailu <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a> nebo telefonu <a href="tel:+420606731316">+420 606 731 316</a>. Radi vam poradime a pomuzeme s vyberem nejvhodnejsi varianty pro vas nakup.</p>
    `,
  },
  {
    globalSlug: 'returns-and-complaints-page',
    title: 'Reklamace a vraceni',
    heroImageUrl: 'https://lumerashop.cz/wp-content/uploads/2025/11/reklamace-bg-4.webp',
    seoDescription:
      'Postup pro vraceni zbozi, reklamace, formulare ke stazeni a kontaktni informace pro Lumera.',
    contentHtml: `
      <p>Pokud vam zakoupene zbozi nevyhovuje, mate moznost jej vratit bez uvedeni duvodu v zakonne lhute 14 dnu. Lhuta pro odstoupeni od smlouvy cini 14 kalendarnich dnu a zacina bezet nasledujici pracovni den po prevzeti objednavky.</p>
      <h2>Jakym zpusobem lze zbozi vratit</h2>
      <p>(v zakonne lhute 14 dnu i v pripade reklamace)</p>
      <ul>
        <li><strong>Vlastnim dopravcem</strong><br />Zbozi muzete zaslat postou nebo libovolnym prepravcem na adresu: <strong>MAX &amp; VLD s.r.o. Lumerashop.cz, Lisabonska 2394, 190 00 Praha 9-Liben</strong>. Prosime o peclive zabaleni zbozi a prilozeni kopie faktury spolu s formularem, ktery byl soucasti zasilky.</li>
        <li><strong>Osobne</strong><br />Vraceni zbozi je mozne take osobne na vydejnim miste na adrese <strong>Lisabonska 2394, 190 00 Praha 9-Liben</strong>.</li>
      </ul>
      <h2>Reklamacni formular</h2>
      <p><a href="https://lumerashop.cz/wp-content/uploads/2025/11/Reklamacni-formular-Lumera.pdf" target="_blank" rel="noreferrer">Reklamacni formular ke stazeni zde</a></p>
      <h2>Odstoupeni od smlouvy</h2>
      <p><a href="https://lumerashop.cz/odstoupeni-od-smlouvy-lumera/" target="_blank" rel="noreferrer">Formular pro odstoupeni od smlouvy ke stazeni zde</a></p>
      <h2>Informace k vraceni zbozi v zakonne lhute</h2>
      <ul>
        <li>Zbozi je mozne vratit do 14 kalendarnich dnu od jeho prevzeti.</li>
        <li>Vracene zbozi musi byt v puvodnim stavu, neposkozene a bez znamek pouzivani.</li>
        <li>V pripade vraceni neuplneho, poskozeneho nebo zjevne opotrebeneho zbozi si vyhrazujeme pravo uctovat primerenou nahradu za snizeni jeho hodnoty.</li>
        <li>Financni castku vam zasleme co nejdrive, nejpozdeji vsak do 14 dnu od prevzeti vraceneho zbozi.</li>
        <li>Zbozi doporucujeme vracet radne zabalene, aby nedoslo k poskozeni behem prepravy.</li>
        <li>Pokud byl k objednavce prilozen darek, je nutne jej vratit spolecne se zbozim.</li>
        <li>O prijeti vratky vas budeme informovat e-mailem nebo telefonicky.</li>
      </ul>
      <h2>Informace k reklamaci zbozi</h2>
      <ul>
        <li>Na veskere zbozi zakoupene v nasem e-shopu se vztahuje zakonna zarucni doba 24 mesicu.</li>
        <li>Reklamace vyrizujeme bez zbytecneho odkladu, nejpozdeji vsak do 30 dnu od jejiho prijeti.</li>
        <li>V pripade uznani reklamace vam zasleme opraveny nebo novy produkt na nase naklady.</li>
        <li>Zakonna zaruka se nevztahuje na poskozeni vznikla nespravnym zachazenim, napr. skvrny, oderky, mechanicke poskozeni nebo nadmerne zatizeni.</li>
        <li>Reklamovane zbozi prosime dukladne zabalte a odeslete nebo osobne doructe na adresu provozovny e-shopu.</li>
        <li>Financni castku za dopravu v pripade vratky odecteme z ceny zbozi.</li>
      </ul>
      <h2>V pripade jakychkoliv dotazu nas nevahejte kontaktovat</h2>
      <p>Tel: <a href="tel:+420606731316">+420 606 731 316</a><br />E-mail: <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a></p>
    `,
  },
  {
    globalSlug: 'terms-and-conditions-page',
    title: 'Obchodni podminky',
    heroImageUrl: 'https://lumerashop.cz/wp-content/uploads/2025/11/obchodni-podminky-bg-4.webp',
    seoDescription:
      'Aktualni obchodni podminky e-shopu Lumera vcetne dopravy, plateb, reklamaci a odstoupeni od smlouvy.',
    contentHtml: `
      <p><strong>Platne od:</strong> 11.11.2025</p>
      <h2>I. Uvodni ustanoveni</h2>
      <p><strong>1.</strong> Tyto obchodni podminky dale jen Podminky upravuji prava a povinnosti mezi Prodavajicim a Kupujicim.</p>
      <p><strong>Prodavajici:</strong> MAX &amp; VLD s.r.o., ICO 23254246, DIC CZ23254246, se sidlem Decinska 552/1, Strizkov, 180 00 Praha.</p>
      <p><strong>Kupujici:</strong> fyzicka osoba - spotrebitel, ktera uzavira tuto smlouvu mimo ramec sve podnikatelske cinnosti.</p>
      <p><strong>2.</strong> Provozovatelem internetoveho obchodu je <a href="https://lumerashop.cz" target="_blank" rel="noreferrer">LumeraShop.cz</a>.</p>
      <p><strong>3.</strong> Tyto podminky se vztahuji na smlouvy uzavirane prostrednictvim weboveho rozhrani e-shopu.</p>
      <p><strong>4.</strong> Zneni techto podminek je k dispozici na adrese <a href="https://lumerashop.cz/obchodni-podminky" target="_blank" rel="noreferrer">https://lumerashop.cz/obchodni-podminky</a>.</p>
      <p><strong>5.</strong> Kupni smlouva mezi Prodavajicim a Kupujicim je uzavrena v okamziku odeslani potvrzeni objednavky e-mailem kupujicimu.</p>
      <h2>II. Definice pojmu</h2>
      <ul>
        <li><strong>E-shop</strong> - internetovy obchod Prodavajiciho na adrese LumeraShop.cz.</li>
        <li><strong>Zbozi</strong> - veci nabizene Prodavajicim v katalogu e-shopu.</li>
        <li><strong>Kupujici</strong> - spotrebitel podle paragrafu 419 zakona c. 89/2012 Sb., obcansky zakonik.</li>
        <li><strong>Smlouva</strong> - kupni smlouva uzavrena mezi Kupujicim a Prodavajicim podle techto Podminek.</li>
      </ul>
      <h2>III. Informace o zbozi a cenach</h2>
      <ol>
        <li>Zbozi je prezentovano v e-shopu fotografiemi, popisy a technickymi udaji.</li>
        <li>Ceny jsou uvedeny v CZK vcetne DPH a vsech poplatku.</li>
        <li>Prodavajici si vyhrazuje pravo ceny zmenit, avsak cena uvedena v objednavce je zavazna.</li>
        <li>Uvedene barvy nebo vyrobni vlastnosti se mohou nepatrne lisit vlivem pouziti monitoru nebo prirodniho materialu.</li>
      </ol>
      <h2>IV. Objednavka a uzavreni smlouvy</h2>
      <ol>
        <li>Kupujici muze objednavku ucinit prostrednictvim registracniho zakaznickeho uctu nebo bez registrace vyplnenim objednavkoveho formulare.</li>
        <li>Kupujici si voli zbozi, zpusob dopravy a zpusob platby.</li>
        <li>Prodavajici po prijeti objednavky zasle potvrzeni e-mailem - tim je smlouva uzavrena.</li>
        <li>Kupujici je povinen uvadet pravdive kontaktni udaje a sledovat e-mailovou komunikaci.</li>
      </ol>
      <h2>V. Zpusoby dopravy a platby</h2>
      <h3>5.1 Doprava</h3>
      <ul>
        <li>Kuryr napr. PPL na adresu Kupujiciho.</li>
        <li>Vydejni mista napr. Zasilkovna.</li>
        <li>Doprava zdarma pri objednavce nad <strong>1 500 Kc</strong>.</li>
      </ul>
      <h3>5.2 Platba</h3>
      <ul>
        <li>Online platba kartou nebo digitalne napr. Apple Pay a Google Pay.</li>
        <li>Bankovni prevod na ucet Prodavajiciho.</li>
        <li>Dobirka - platba pri prevzeti zasilky.</li>
        <li>Platba pri osobnim odberu na vydejnim miste.</li>
      </ul>
      <h2>VI. Pravo na odstoupeni od smlouvy</h2>
      <ol>
        <li>Spotrebitel Kupujici ma pravo odstoupit od smlouvy do 14 dnu od prevzeti zbozi bez udani duvodu.</li>
        <li>Zbozi musi byt vraceno v neposkozenem stavu, vcetne obalu a prislusenstvi.</li>
        <li>Naklady za vraceni nese Kupujici, pokud nejde o vadu nebo chybne dodani.</li>
        <li>Vzorovy formular pro odstoupeni je soucasti webu a lze ho stahnout.</li>
      </ol>
      <h2>VII. Reklamace a zaruka</h2>
      <p>Prodavajici poskytuje zakonnou zaruku 24 mesicu, pokud neni u zbozi uvedeno jinak.</p>
      <p>Reklamaci lze uplatnit e-mailem <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a> nebo postou na adresu Prodavajiciho.</p>
      <p>Prodavajici posoudi reklamaci a v pripade opravnenosti zajisti opravu nebo vymenu do 30 dnu.</p>
      <p>Reklamaci nelze uplatnit pri beznem opotrebeni, poskozeni zpusobenem nespravnym uzivanim nebo zmenou barvy vlivem slunce.</p>
      <h2>VIII. Ochrana osobnich udaju a cookies</h2>
      <p>Prodavajici zpracovava osobni udaje v souladu s narizeni GDPR. Podminky zpracovani jsou uvedeny na strance Ochrana osobnich udaju. Informace o cookies jsou uvedeny na strance Cookies.</p>
      <h2>IX. Dusevni vlastnictvi</h2>
      <p>Veskery obsah webu - texty, fotografie, loga a dalsi prvky - je chranen autorskym pravem. Jakekoli neopravnene pouziti je zakazano.</p>
      <h2>X. Zmena podminek</h2>
      <ol>
        <li>Prodavajici si vyhrazuje pravo zmenit tyto Podminky.</li>
        <li>Nove zneni bude zverejneno na webu a nabude ucinnosti dnem uvedenym v oznameni.</li>
        <li>Pokud Kupujici nesouhlasi s novym znenim, ma pravo smlouvu vypovedet, pokud to povaha smluvniho vztahu umoznuje.</li>
      </ol>
      <h2>XI. Zaverecna ustanoveni</h2>
      <ol>
        <li>Pokud je nektere ustanoveni techto Podminek neplatne, ostatni zustavaji v platnosti.</li>
        <li>Veskere spory vyplyvajici z techto Podminek se ridi pravem Ceske republiky.</li>
        <li>Tyto Podminky nabyvaji ucinnosti dnem zverejneni na webu.</li>
      </ol>
      <p><a href="https://lumerashop.cz/wp-content/uploads/2025/11/Reklamacni-formular-Lumera.pdf" target="_blank" rel="noreferrer">Reklamacni formular ke stazeni zde</a></p>
      <p><a href="https://lumerashop.cz/odstoupeni-od-smlouvy-lumera/" target="_blank" rel="noreferrer">Odstoupeni od smlouvy ke stazeni zde</a></p>
    `,
  },
  {
    globalSlug: 'privacy-policy-page',
    title: 'Ochrana osobnich udaju',
    heroImageUrl: 'https://lumerashop.cz/wp-content/uploads/2025/11/privacy-policy-bg-4.webp',
    seoDescription:
      'Jak Lumera zpracovava osobni udaje zakazniku, pravni zaklady, doba uchovavani a vase prava podle GDPR.',
    contentHtml: `
      <p>Vazime si vaseho soukromi. Tato stranka vam prinasi informace o tom, jak obchod Lumera jako spravce zpracovava vase osobni udaje v souvislosti s provozem e-shopu, objednavkami, komunikaci a dalsimi sluzbami.</p>
      <h2>Spravce a zakladni informace</h2>
      <p>Spravcem vasich osobnich udaju je <strong>LumeraShop.cz</strong>, provozovana spolecnosti <strong>MAX &amp; VLD s.r.o.</strong>, se sidlem <strong>Decinska 552/1, Strizkov, 180 00 Praha</strong>, <strong>ICO: 23254246</strong>, <strong>DIC: CZ23254246</strong>.</p>
      <p>Kontakt: e-mail <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a>, telefon <a href="tel:+420606731316">+420 606 731 316</a>.</p>
      <p>Tato zasada se vztahuje na zpracovani udaju zakazniku, navstevniku webu a dalsich osob, kterych se tyka provoz e-shopu.</p>
      <h2>Zdroje a kategorie osobnich udaju</h2>
      <p>Zpracovavame osobni udaje, ktere jste nam poskytli prostrednictvim registrace, objednavky, kontaktu nebo jine komunikace. Patri sem napriklad jmeno a prijmeni, adresa doruceni, e-mail, telefonni cislo, platebni udaje v rozsahu nutnem pro plneni objednavky a ucetni udaje.</p>
      <p>Udaje muzeme ziskat i z jinych legalnich zdroju, napr. od prepravce, platebni brany nebo verejne dostupnych registru, pokud to vyzaduje plneni smlouvy.</p>
      <h2>Ucely zpracovani a pravni zaklad</h2>
      <p>Vase udaje zpracovavame zejmena za ucelem:</p>
      <ul>
        <li>plneni kupni smlouvy - doruceni zbozi a ucetnictvi,</li>
        <li>komunikace ohledne objednavky a servisu,</li>
        <li>marketingu - pokud jste nam udelili souhlas,</li>
        <li>plneni pravnich povinnosti, napr. archivace a fakturace.</li>
      </ul>
      <p>Pravnimi zaklady pro zpracovani jsou napr. clanek 6 odstavec 1 pismeno b GDPR - plneni smlouvy - nebo clanek 6 odstavec 1 pismeno a GDPR - souhlas.</p>
      <h2>Doba uchovavani osobnich udaju</h2>
      <p>Uchovavame osobni udaje po dobu nezbytnou k plneni ucelu zpracovani a radnemu vykonu pravnich naroku. Po uplynuti teto doby udaje vymazeme nebo anonymizujeme, pokud nejsou dale potrebne.</p>
      <h2>Prijemci osobnich udaju a prenos do zahranici</h2>
      <p>Vase udaje mohou byt sdileny s dodavateli a zpracovateli, kteri zajistuji napriklad platby, dopravu, webhosting ci marketingove sluzby.</p>
      <p>Prenos udaju mimo Evropskou unii nepredpokladame. Pokud by k nemu doslo, budou prijata odpovidajici opatreni zabezpeceni.</p>
      <h2>Vase prava</h2>
      <p>V souladu s narizeni GDPR mate pravo:</p>
      <ul>
        <li>pozadat o pristup k osobnim udajum,</li>
        <li>opravit je,</li>
        <li>pozadat o omezeni zpracovani,</li>
        <li>pozadat o vymaz, tedy pravo byt zapomenut,</li>
        <li>vznest namitku proti zpracovani,</li>
        <li>pozadat o prenositelnost udaju,</li>
        <li>kdykoli odvolat souhlas se zpracovanim, pokud byl pravnim zakladem souhlas.</li>
      </ul>
      <p>Pokud mate podezreni na poruseni ochrany udaju, muzete se obratit na Urad pro ochranu osobnich udaju.</p>
      <h2>Zabezpeceni osobnich udaju</h2>
      <p>Prijali jsme technicka i organizacni opatreni k ochrane osobnich udaju pred ztratou, znicenim, neopravnenym pristupem ci jinym nevhodnym zpracovanim. K udajum maji pristup pouze opravnene osoby s nutnosti zachovani mlcenlivosti.</p>
      <h2>Zmeny techto zasad</h2>
      <p>Zasady ochrany osobnich udaju byly naposledy aktualizovany k datu 11.11.2025. Doporucujeme tuto stranku pravidelne kontrolovat, protoze zmeny mohou byt provedeny dle vyvoje pravnich nebo technickych pozadavku.</p>
    `,
  },
  {
    globalSlug: 'cookies-page',
    title: 'Zasady pouzivani souboru cookies',
    heroImageUrl: 'https://lumerashop.cz/wp-content/uploads/2025/11/cookies-bg-4.webp',
    seoDescription:
      'Prehled pouzivanych cookies, jejich typu, spravy souhlasu a prav uzivatelu na webu Lumera.',
    contentHtml: `
      <p>Nase webove stranky vyuzivaji soubory cookies a podobne technologie dale jen cookies za ucelem zajisteni jejich spravneho fungovani, zlepseni uzivatelskeho prozitku a pro ucely analyzy. Vase souhlasne nastaveni muzete upravit nebo odvolat kdykoliv.</p>
      <p><strong>Posledni aktualizace:</strong> 11. 11. 2025</p>
      <h2>Co jsou cookies?</h2>
      <p>Cookies jsou male textove soubory nebo technologicke prvky, ktere jsou po navsteve webu ulozeny ve vasem zarizeni, napr. pocitaci, tabletu nebo mobilu. Pri dalsi navsteve mohou byt tyto informace zaslany zpet na nas server nebo server treti strany. Cookies nam pomahaji zapamatovat vase nastaveni, zjednodusit dalsi navstevu a zlepsit funkcnost webu.</p>
      <h2>Jake typy cookies pouzivame?</h2>
      <p>Na nasem webu pouzivame tyto zakladni kategorie cookies:</p>
      <ul>
        <li><strong>Nutne functional cookies</strong> - zajistuji zakladni funkce webu, bez jejich pouziti by web nemusel fungovat spravne.</li>
        <li><strong>Vykonnostni performance nebo analytics cookies</strong> - pomahaji nam analyzovat navstevnost a chovani uzivatelu, abychom mohli web zlepsovat.</li>
        <li><strong>Marketingove nebo profiling cookies</strong> - vyuzivaji se pro cileni reklam, sledovani chovani napric weby a provedeni profilovani. Tyto cookies jsou vyuzivany pouze na zaklade vaseho souhlasu.</li>
      </ul>
      <h2>Pouzite cookies / Priklady</h2>
      <p>Nize uvadime priklady nejpouzivanejsich cookies na nasem webu, nejde o kompletni seznam:</p>
      <ul>
        <li>Cookie <strong>_ga</strong> - Google Analytics, slouzi ke sledovani unikatnich navstevniku.</li>
        <li>Cookie <strong>PHPSESSID</strong> - uchovava identifikacni relaci kazdeho uzivatele.</li>
        <li>Cookie <strong>_fbp</strong> - slouzi pro cileni reklam a mereni konverzi v ramci Facebook Pixel.</li>
      </ul>
      <p>Pokud si prejete cely seznam cookies, kontaktujte nas na <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a>.</p>
      <h2>Souhlas s cookies / Sprava nastaveni</h2>
      <p>Pri vasi prvni navsteve webu se zobrazi banner s moznosti vyberu kategorii cookies, ktere chcete povolit. Souhlas muzete kdykoliv zmenit pomoci odkazu v paticce nebo ve svem prohlizeci. Deaktivace urcitych cookies muze ovlivnit funkcnost nekterych casti webu.</p>
      <h2>Vase prava</h2>
      <p>Jako uzivatel mate pravo pozadat o pristup ke svym osobnim udajum, jejich opravu, omezeni nebo vymaz v souladu s GDPR. Pokud mate jakykoliv dotaz ohledne naseho pouziti cookies nebo zpracovani vasich udaju, kontaktujte nas na <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a>.</p>
      <h2>Zmeny zasad</h2>
      <p>Tyto zasady pouzivani souboru cookies mohou byt cas od casu aktualizovany. Datum posledni zmeny je uvedeno vyse. Doporucujeme prubezne kontrolovat tuto stranku.</p>
    `,
  },
]
