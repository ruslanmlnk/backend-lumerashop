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
      'Informace o možnostech dopravy, způsobech platby, dodacích podmínkách a kontaktech pro nákup v Lumera.',
    contentHtml: `
      <p>Na této stránce najdete kompletní informace o možnostech dopravy a způsobech platby v našem e-shopu Lumera. Chceme, abyste objednávku dokončili s přehledem a bez obav.</p>
      <h2>Způsoby dopravy</h2>
      <p>Nabízíme několik možností doručení, abyste si mohli vybrat tu, která vám nejlépe vyhovuje. Všechny ceny jsou uvedeny včetně DPH a zobrazují se v košíku před dokončením objednávky.</p>
      <ul>
        <li><strong>Kurýrní doručení na adresu</strong> - obvykle 1-3 pracovní dny po expedici, sledování zásilky je v ceně zahrnuto.</li>
        <li><strong>Výdejní místa / výdejní boxy</strong> - pohodlné vyzvednutí v síti partnerů, cena nižší než doručení na adresu.</li>
        <li><strong>Osobní odběr</strong> - zdarma, pokud si zboží vyzvednete u nás po domluvě.</li>
      </ul>
      <p>Pokud hodnota objednávky přesáhne <strong>1 500 Kč</strong>, automaticky získáváte dopravu zdarma.</p>
      <h2>Způsoby platby</h2>
      <p>Při platbě za vaše nové kožené doplňky můžete zvolit jednu z nabízených metod:</p>
      <ul>
        <li><strong>Online platba kartou nebo Apple Pay / Google Pay</strong> - platba proběhne okamžitě a objednávka je ihned potvrzena.</li>
        <li><strong>Převodem na účet</strong> - po dokončení objednávky obdržíte platební údaje e-mailem, platbu uhraďte do 10 dnů.</li>
        <li><strong>Dobírkou při doručení</strong> - platíte kurýrovi při převzetí zásilky. U některých způsobů může být účtován doplatek.</li>
      </ul>
      <p>Po zaplacení nebo potvrzení platby zahájíme expedici vašeho zboží.</p>
      <h2>Termíny a dodací podmínky</h2>
      <p>Expedice probíhá běžně 1-2 pracovní dny po potvrzení objednávky a platby.<br />Doba doručení závisí na vybrané metodě a může se prodloužit při výprodeji, svátcích nebo při vyšším objemu objednávek. Zboží je odesláno v bezpečném balení, aby vaše nové modely z Itálie dorazily v perfektním stavu.</p>
      <h2>Náklady na dopravu a platbu zdarma</h2>
      <p>Získejte dopravu zdarma, když hodnota vaší objednávky dosáhne nebo překročí <strong>1 500 Kč</strong>. Placené způsoby dopravy se zobrazí v košíku ještě před tím, než objednávku dokončíte, takže vždy vidíte konečnou cenu.</p>
      <p>Máte-li jakoukoli otázku ohledně dopravy či platby, kontaktujte náš zákaznický servis na e-mailu <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a> nebo telefonu <a href="tel:+420606731316">+420 606 731 316</a>. Rádi vám poradíme a pomůžeme s výběrem nejvhodnější varianty pro váš nákup.</p>
    `,
  },
  {
    globalSlug: 'returns-and-complaints-page',
    title: 'Reklamace a vrácení',
    heroImageUrl: 'https://lumerashop.cz/wp-content/uploads/2025/11/reklamace-bg-4.webp',
    seoDescription:
      'Postup pro vrácení zboží, reklamace, formuláře ke stažení a kontaktní informace pro Lumera.',
    contentHtml: `
      <p>Pokud vám zakoupené zboží nevyhovuje, máte možnost jej vrátit bez uvedení důvodu v zákonné lhůtě 14 dnů. Lhůta pro odstoupení od smlouvy činí 14 kalendářních dnů a začíná běžet následující pracovní den po převzetí objednávky.</p>
      <h2>Jakým způsobem lze zboží vrátit</h2>
      <p>(v zákonné lhůtě 14 dnů i v případě reklamace)</p>
      <ul>
        <li><strong>Vlastním dopravcem</strong><br />Zboží můžete zaslat poštou nebo libovolným přepravcem na adresu: <strong>MAX &amp; VLD s.r.o. Lumerashop.cz, Lisabonská 2394, 190 00 Praha 9-Libeň</strong>. Prosíme o pečlivé zabalení zboží a přiložení kopie faktury spolu s formulářem, který byl součástí zásilky.</li>
        <li><strong>Osobně</strong><br />Vrácení zboží je možné také osobně na výdejním místě na adrese <strong>Lisabonská 2394, 190 00 Praha 9-Libeň</strong>.</li>
      </ul>
      <h2>Reklamační formulář</h2>
      <p><a href="https://lumerashop.cz/wp-content/uploads/2025/11/Reklamacni-formular-Lumera.pdf" target="_blank" rel="noreferrer">Reklamační formulář ke stažení zde</a></p>
      <h2>Odstoupení od smlouvy</h2>
      <p><a href="https://lumerashop.cz/odstoupeni-od-smlouvy-lumera/" target="_blank" rel="noreferrer">Formulář pro odstoupení od smlouvy ke stažení zde</a></p>
      <h2>Informace k vrácení zboží v zákonné lhůtě</h2>
      <ul>
        <li>Zboží je možné vrátit do 14 kalendářních dnů od jeho převzetí.</li>
        <li>Vrácené zboží musí být v původním stavu, nepoškozené a bez známek používání.</li>
        <li>V případě vrácení neúplného, poškozeného nebo zjevně opotřebeného zboží si vyhrazujeme právo účtovat přiměřenou náhradu za snížení jeho hodnoty.</li>
        <li>Finanční částku vám zašleme co nejdříve, nejpozději však do 14 dnů od převzetí vráceného zboží.</li>
        <li>Zboží doporučujeme vracet řádně zabalené, aby nedošlo k poškození během přepravy.</li>
        <li>Pokud byl k objednávce přiložen dárek, je nutné jej vrátit společně se zbožím.</li>
        <li>O přijetí vratky vás budeme informovat e-mailem nebo telefonicky.</li>
      </ul>
      <h2>Informace k reklamaci zboží</h2>
      <ul>
        <li>Na veškeré zboží zakoupené v našem e-shopu se vztahuje zákonná záruční doba 24 měsíců.</li>
        <li>Reklamace vyřizujeme bez zbytečného odkladu, nejpozději však do 30 dnů od jejího přijetí.</li>
        <li>V případě uznání reklamace vám zašleme opravený nebo nový produkt na naše náklady.</li>
        <li>Zákonná záruka se nevztahuje na poškození vzniklá nesprávným zacházením, např. skvrny, oděrky, mechanické poškození nebo nadměrné zatížení.</li>
        <li>Reklamované zboží prosíme důkladně zabalte a odešlete nebo osobně doručte na adresu provozovny e-shopu.</li>
        <li>Finanční částku za dopravu v případě vratky odečteme z ceny zboží.</li>
      </ul>
      <h2>V případě jakýchkoliv dotazů nás neváhejte kontaktovat</h2>
      <p>Tel: <a href="tel:+420606731316">+420 606 731 316</a><br />E-mail: <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a></p>
    `,
  },
  {
    globalSlug: 'terms-and-conditions-page',
    title: 'Obchodní podmínky',
    heroImageUrl: 'https://lumerashop.cz/wp-content/uploads/2025/11/obchodni-podminky-bg-4.webp',
    seoDescription:
      'Aktuální obchodní podmínky e-shopu Lumera včetně dopravy, plateb, reklamací a odstoupení od smlouvy.',
    contentHtml: `
      <p><strong>Platné od:</strong> 11. 11. 2025</p>
      <h2>I. Úvodní ustanovení</h2>
      <p><strong>1.</strong> Tyto obchodní podmínky (dále jen Podmínky) upravují práva a povinnosti mezi Prodávajícím a Kupujícím.</p>
      <p><strong>Prodávající:</strong> MAX &amp; VLD s.r.o., IČO 23254246, DIČ CZ23254246, se sídlem Děčínská 552/1, Střížkov, 180 00 Praha.</p>
      <p><strong>Kupující:</strong> fyzická osoba - spotřebitel, která uzavírá tuto smlouvu mimo rámec své podnikatelské činnosti.</p>
      <p><strong>2.</strong> Provozovatelem internetového obchodu je <a href="https://lumerashop.cz" target="_blank" rel="noreferrer">LumeraShop.cz</a>.</p>
      <p><strong>3.</strong> Tyto podmínky se vztahují na smlouvy uzavírané prostřednictvím webového rozhraní e-shopu.</p>
      <p><strong>4.</strong> Znění těchto podmínek je k dispozici na adrese <a href="https://lumerashop.cz/obchodni-podminky" target="_blank" rel="noreferrer">https://lumerashop.cz/obchodni-podminky</a>.</p>
      <p><strong>5.</strong> Kupní smlouva mezi Prodávajícím a Kupujícím je uzavřena v okamžiku odeslání potvrzení objednávky e-mailem kupujícímu.</p>
      <h2>II. Definice pojmů</h2>
      <ul>
        <li><strong>E-shop</strong> - internetový obchod Prodávajícího na adrese LumeraShop.cz.</li>
        <li><strong>Zboží</strong> - věci nabízené Prodávajícím v katalogu e-shopu.</li>
        <li><strong>Kupující</strong> - spotřebitel podle paragrafu 419 zákona č. 89/2012 Sb., občanský zákoník.</li>
        <li><strong>Smlouva</strong> - kupní smlouva uzavřená mezi Kupujícím a Prodávajícím podle těchto Podmínek.</li>
      </ul>
      <h2>III. Informace o zboží a cenách</h2>
      <ol>
        <li>Zboží je prezentováno v e-shopu fotografiemi, popisy a technickými údaji.</li>
        <li>Ceny jsou uvedeny v CZK včetně DPH a všech poplatků.</li>
        <li>Prodávající si vyhrazuje právo ceny změnit, avšak cena uvedená v objednávce je závazná.</li>
        <li>Uvedené barvy nebo výrobní vlastnosti se mohou nepatrně lišit vlivem použití monitoru nebo přírodního materiálu.</li>
      </ol>
      <h2>IV. Objednávka a uzavření smlouvy</h2>
      <ol>
        <li>Kupující může objednávku učinit prostřednictvím registračního zákaznického účtu nebo bez registrace vyplněním objednávkového formuláře.</li>
        <li>Kupující si volí zboží, způsob dopravy a způsob platby.</li>
        <li>Prodávající po přijetí objednávky zašle potvrzení e-mailem - tím je smlouva uzavřena.</li>
        <li>Kupující je povinen uvádět pravdivé kontaktní údaje a sledovat e-mailovou komunikaci.</li>
      </ol>
      <h2>V. Způsoby dopravy a platby</h2>
      <h3>5.1 Doprava</h3>
      <ul>
        <li>Kurýr např. PPL na adresu Kupujícího.</li>
        <li>Výdejní místa např. Zásilkovna.</li>
        <li>Doprava zdarma při objednávce nad <strong>1 500 Kč</strong>.</li>
      </ul>
      <h3>5.2 Platba</h3>
      <ul>
        <li>Online platba kartou nebo digitálně např. Apple Pay a Google Pay.</li>
        <li>Bankovní převod na účet Prodávajícího.</li>
        <li>Dobírka - platba při převzetí zásilky.</li>
        <li>Platba při osobním odběru na výdejním místě.</li>
      </ul>
      <h2>VI. Právo na odstoupení od smlouvy</h2>
      <ol>
        <li>Spotřebitel Kupující má právo odstoupit od smlouvy do 14 dnů od převzetí zboží bez udání důvodu.</li>
        <li>Zboží musí být vráceno v nepoškozeném stavu, včetně obalu a příslušenství.</li>
        <li>Náklady za vrácení nese Kupující, pokud nejde o vadu nebo chybné dodání.</li>
        <li>Vzorový formulář pro odstoupení je součástí webu a lze ho stáhnout.</li>
      </ol>
      <h2>VII. Reklamace a záruka</h2>
      <p>Prodávající poskytuje zákonnou záruku 24 měsíců, pokud není u zboží uvedeno jinak.</p>
      <p>Reklamaci lze uplatnit e-mailem <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a> nebo poštou na adresu Prodávajícího.</p>
      <p>Prodávající posoudí reklamaci a v případě oprávněnosti zajistí opravu nebo výměnu do 30 dnů.</p>
      <p>Reklamaci nelze uplatnit při běžném opotřebení, poškození způsobeném nesprávným užíváním nebo změnou barvy vlivem slunce.</p>
      <h2>VIII. Ochrana osobních údajů a cookies</h2>
      <p>Prodávající zpracovává osobní údaje v souladu s nařízením GDPR. Podmínky zpracování jsou uvedeny na stránce Ochrana osobních údajů. Informace o cookies jsou uvedeny na stránce Cookies.</p>
      <h2>IX. Duševní vlastnictví</h2>
      <p>Veškerý obsah webu - texty, fotografie, loga a další prvky - je chráněn autorským právem. Jakékoli neoprávněné použití je zakázáno.</p>
      <h2>X. Změna podmínek</h2>
      <ol>
        <li>Prodávající si vyhrazuje právo změnit tyto Podmínky.</li>
        <li>Nové znění bude zveřejněno na webu a nabude účinnosti dnem uvedeným v oznámení.</li>
        <li>Pokud Kupující nesouhlasí s novým zněním, má právo smlouvu vypovědět, pokud to povaha smluvního vztahu umožňuje.</li>
      </ol>
      <h2>XI. Závěrečná ustanovení</h2>
      <ol>
        <li>Pokud je některé ustanovení těchto Podmínek neplatné, ostatní zůstávají v platnosti.</li>
        <li>Veškeré spory vyplývající z těchto Podmínek se řídí právem České republiky.</li>
        <li>Tyto Podmínky nabývají účinnosti dnem zveřejnění na webu.</li>
      </ol>
      <p><a href="https://lumerashop.cz/wp-content/uploads/2025/11/Reklamacni-formular-Lumera.pdf" target="_blank" rel="noreferrer">Reklamační formulář ke stažení zde</a></p>
      <p><a href="https://lumerashop.cz/odstoupeni-od-smlouvy-lumera/" target="_blank" rel="noreferrer">Odstoupení od smlouvy ke stažení zde</a></p>
    `,
  },
  {
    globalSlug: 'privacy-policy-page',
    title: 'Ochrana osobních údajů',
    heroImageUrl: 'https://lumerashop.cz/wp-content/uploads/2025/11/privacy-policy-bg-4.webp',
    seoDescription:
      'Jak Lumera zpracovává osobní údaje zákazníků, právní základy, dobu uchovávání a vaše práva podle GDPR.',
    contentHtml: `
      <p>Vážíme si vašeho soukromí. Tato stránka vám přináší informace o tom, jak obchod Lumera jako správce zpracovává vaše osobní údaje v souvislosti s provozem e-shopu, objednávkami, komunikací a dalšími službami.</p>
      <h2>Správce a základní informace</h2>
      <p>Správcem vašich osobních údajů je <strong>LumeraShop.cz</strong>, provozovaná společností <strong>MAX &amp; VLD s.r.o.</strong>, se sídlem <strong>Děčínská 552/1, Střížkov, 180 00 Praha</strong>, <strong>IČO: 23254246</strong>, <strong>DIČ: CZ23254246</strong>.</p>
      <p>Kontakt: e-mail <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a>, telefon <a href="tel:+420606731316">+420 606 731 316</a>.</p>
      <p>Tyto zásady se vztahují na zpracování údajů zákazníků, návštěvníků webu a dalších osob, kterých se týká provoz e-shopu.</p>
      <h2>Zdroje a kategorie osobních údajů</h2>
      <p>Zpracováváme osobní údaje, které jste nám poskytli prostřednictvím registrace, objednávky, kontaktu nebo jiné komunikace. Patří sem například jméno a příjmení, adresa doručení, e-mail, telefonní číslo, platební údaje v rozsahu nutném pro plnění objednávky a účetní údaje.</p>
      <p>Údaje můžeme získat i z jiných legálních zdrojů, např. od přepravce, platební brány nebo veřejně dostupných registrů, pokud to vyžaduje plnění smlouvy.</p>
      <h2>Účely zpracování a právní základ</h2>
      <p>Vaše údaje zpracováváme zejména za účelem:</p>
      <ul>
        <li>plnění kupní smlouvy - doručení zboží a účetnictví,</li>
        <li>komunikace ohledně objednávky a servisu,</li>
        <li>marketingu - pokud jste nám udělili souhlas,</li>
        <li>plnění právních povinností, např. archivace a fakturace.</li>
      </ul>
      <p>Právními základy pro zpracování jsou např. článek 6 odstavec 1 písmeno b GDPR - plnění smlouvy - nebo článek 6 odstavec 1 písmeno a GDPR - souhlas.</p>
      <h2>Doba uchovávání osobních údajů</h2>
      <p>Uchováváme osobní údaje po dobu nezbytnou k plnění účelu zpracování a řádnému výkonu právních nároků. Po uplynutí této doby údaje vymažeme nebo anonymizujeme, pokud nejsou dále potřebné.</p>
      <h2>Příjemci osobních údajů a přenos do zahraničí</h2>
      <p>Vaše údaje mohou být sdíleny s dodavateli a zpracovateli, kteří zajišťují například platby, dopravu, webhosting či marketingové služby.</p>
      <p>Přenos údajů mimo Evropskou unii nepředpokládáme. Pokud by k němu došlo, budou přijata odpovídající opatření zabezpečení.</p>
      <h2>Vaše práva</h2>
      <p>V souladu s nařízením GDPR máte právo:</p>
      <ul>
        <li>požádat o přístup k osobním údajům,</li>
        <li>opravit je,</li>
        <li>požádat o omezení zpracování,</li>
        <li>požádat o výmaz, tedy právo být zapomenut,</li>
        <li>vznést námitku proti zpracování,</li>
        <li>požádat o přenositelnost údajů,</li>
        <li>kdykoli odvolat souhlas se zpracováním, pokud byl právním základem souhlas.</li>
      </ul>
      <p>Pokud máte podezření na porušení ochrany údajů, můžete se obrátit na Úřad pro ochranu osobních údajů.</p>
      <h2>Zabezpečení osobních údajů</h2>
      <p>Přijali jsme technická i organizační opatření k ochraně osobních údajů před ztrátou, zničením, neoprávněným přístupem či jiným nevhodným zpracováním. K údajům mají přístup pouze oprávněné osoby s nutností zachování mlčenlivosti.</p>
      <h2>Změny těchto zásad</h2>
      <p>Zásady ochrany osobních údajů byly naposledy aktualizovány k datu 11. 11. 2025. Doporučujeme tuto stránku pravidelně kontrolovat, protože změny mohou být provedeny dle vývoje právních nebo technických požadavků.</p>
    `,
  },
  {
    globalSlug: 'cookies-page',
    title: 'Zásady používání souborů cookies',
    heroImageUrl: 'https://lumerashop.cz/wp-content/uploads/2025/11/cookies-bg-4.webp',
    seoDescription:
      'Přehled používaných cookies, jejich typů, správy souhlasu a práv uživatelů na webu Lumera.',
    contentHtml: `
      <p>Naše webové stránky využívají soubory cookies a podobné technologie (dále jen cookies) za účelem zajištění jejich správného fungování, zlepšení uživatelského prožitku a pro účely analýzy. Vaše souhlasné nastavení můžete upravit nebo odvolat kdykoliv.</p>
      <p><strong>Poslední aktualizace:</strong> 11. 11. 2025</p>
      <h2>Co jsou cookies?</h2>
      <p>Cookies jsou malé textové soubory nebo technologické prvky, které jsou po návštěvě webu uloženy ve vašem zařízení, např. počítači, tabletu nebo mobilu. Při další návštěvě mohou být tyto informace zaslány zpět na náš server nebo server třetí strany. Cookies nám pomáhají zapamatovat vaše nastavení, zjednodušit další návštěvu a zlepšit funkčnost webu.</p>
      <h2>Jaké typy cookies používáme?</h2>
      <p>Na našem webu používáme tyto základní kategorie cookies:</p>
      <ul>
        <li><strong>Nutné funkční cookies</strong> - zajišťují základní funkce webu, bez jejich použití by web nemusel fungovat správně.</li>
        <li><strong>Výkonnostní / analytické cookies</strong> - pomáhají nám analyzovat návštěvnost a chování uživatelů, abychom mohli web zlepšovat.</li>
        <li><strong>Marketingové / profilovací cookies</strong> - využívají se pro cílení reklam, sledování chování napříč weby a provedení profilování. Tyto cookies jsou využívány pouze na základě vašeho souhlasu.</li>
      </ul>
      <h2>Použité cookies / Příklady</h2>
      <p>Níže uvádíme příklady nejpoužívanějších cookies na našem webu, nejde o kompletní seznam:</p>
      <ul>
        <li>Cookie <strong>_ga</strong> - Google Analytics, slouží ke sledování unikátních návštěvníků.</li>
        <li>Cookie <strong>PHPSESSID</strong> - uchovává identifikační relaci každého uživatele.</li>
        <li>Cookie <strong>_fbp</strong> - slouží pro cílení reklam a měření konverzí v rámci Facebook Pixel.</li>
      </ul>
      <p>Pokud si přejete celý seznam cookies, kontaktujte nás na <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a>.</p>
      <h2>Souhlas s cookies / Správa nastavení</h2>
      <p>Při vaší první návštěvě webu se zobrazí banner s možností výběru kategorií cookies, které chcete povolit. Souhlas můžete kdykoliv změnit pomocí odkazu v patičce nebo ve svém prohlížeči. Deaktivace určitých cookies může ovlivnit funkčnost některých částí webu.</p>
      <h2>Vaše práva</h2>
      <p>Jako uživatel máte právo požádat o přístup ke svým osobním údajům, jejich opravu, omezení nebo výmaz v souladu s GDPR. Pokud máte jakýkoliv dotaz ohledně našeho použití cookies nebo zpracování vašich údajů, kontaktujte nás na <a href="mailto:info@lumerashop.cz">info@lumerashop.cz</a>.</p>
      <h2>Změny zásad</h2>
      <p>Tyto zásady používání souborů cookies mohou být čas od času aktualizovány. Datum poslední změny je uvedeno výše. Doporučujeme průběžně kontrolovat tuto stránku.</p>
    `,
  },
]
