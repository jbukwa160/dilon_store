import Link from "next/link";
import { ParentalControlsGuide } from "@/components/ParentalControls";
import type { Locale } from "@/i18n/config";
import { paths } from "@/i18n/paths";
import { price } from "@/lib/format";
import { SHIPPING, SITE } from "@/lib/site";

// Information pages in both languages. Company details come from SITE.company (placeholders until the client fills
// them in). The legal texts follow Bulgarian law (ЗЗП, GDPR) but must be reviewed by the client's lawyer before going live.

export type InfoPage = { title: string; description: string; body: React.ReactNode };

export const INFO_SLUGS = ["delivery", "returns", "discretion", "contact", "terms", "privacy", "cookies", "parental-controls"] as const;
export type InfoSlug = (typeof INFO_SLUGS)[number];

const tel = SITE.phone.replace(/\s/g, "");

function Seller({ locale }: { locale: Locale }) {
  const C = SITE.company;
  return locale === "bg" ? (
    <ul>
      <li>
        <strong>{C.name.bg}</strong>, ЕИК {C.eik}, ДДС № {C.vat}
      </li>
      <li>Седалище и адрес на управление: {C.address.bg}</li>
      <li>
        Имейл: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>, телефон: <a href={`tel:${tel}`}>{SITE.phone}</a>
      </li>
    </ul>
  ) : (
    <ul>
      <li>
        <strong>{C.name.en}</strong>, UIC {C.eik}, VAT No. {C.vat}
      </li>
      <li>Registered address: {C.address.en}</li>
      <li>
        Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>, phone: <a href={`tel:${tel}`}>{SITE.phone}</a>
      </li>
    </ul>
  );
}

function bgPages(): Record<InfoSlug, InfoPage> {
  const P = paths("bg");
  const office = price(SHIPPING.methods[0].price, "bg");
  const toAddress = price(SHIPPING.methods[2].price, "bg");
  const C = SITE.company;
  return {
    delivery: {
      title: "Доставка и плащане",
      description: `Доставка със Speedy и Еконт за ${SHIPPING.days} работни дни, от ${office}. Безплатна над ${SHIPPING.freeFrom} €. Плащане при получаване.`,
      body: (
        <>
          <p>
            Изпращаме в цяла България със Speedy и Еконт. Всяка пратка е в обикновен кашон без лого и надписи — повече за това на страницата{" "}
            <Link href={P.info("discretion")}>Дискретност</Link>.
          </p>
          <h2>Цени на доставката</h2>
          <ul>
            <li>До офис или автомат на Speedy или Еконт — {office}</li>
            <li>До адрес с куриер — {toAddress}</li>
            <li>
              <strong>Безплатно</strong> за поръчки над {SHIPPING.freeFrom} €
            </li>
          </ul>
          <h2>Срок</h2>
          <p>
            Доставката отнема {SHIPPING.days} работни дни след потвърждение на поръчката. Поръчки, направени в събота, неделя или празник,
            обработваме в първия работен ден. Ако продукт се окаже изчерпан след поръчката, ще ви се обадим, преди да изпратим останалото.
          </p>
          <h2>Плащане</h2>
          <p>
            Плащате с наложен платеж — на куриера или в офиса, когато получите пратката. Не е нужна регистрация и не въвеждате данни за карта в
            сайта. Цените са в евро с включен ДДС.
          </p>
          <h2>Преглед при получаване</h2>
          <p>Можете да проверите, че пратката е цяла, преди да платите. Ако кашонът е повреден, откажете я пред куриера и ни се обадете — ще изпратим нова.</p>
        </>
      ),
    },
    returns: {
      title: "Връщане и рекламации",
      description: "14 дни право на отказ за неотворени продукти. Как се връща продукт и как се прави рекламация.",
      body: (
        <>
          <h2>Право на отказ в 14 дни</h2>
          <p>
            Можете да се откажете от поръчката без да посочвате причина в срок от 14 дни от деня, в който сте получили продуктите (чл. 50 от Закона
            за защита на потребителите, ЗЗП). Достатъчно е да ни изпратите имейл на <a href={`mailto:${SITE.email}`}>{SITE.email}</a> с номера на
            поръчката или да използвате образеца по-долу.
          </p>
          <h2>Кои продукти не подлежат на връщане</h2>
          <p>
            По чл. 57, т. 5 от ЗЗП не се връщат <strong>запечатани стоки, които са разпечатани след доставката</strong> и не могат да бъдат върнати
            по хигиенни съображения или заради опазване на здравето. При нас това са:
          </p>
          <ul>
            <li>всички играчки за интимна употреба, чиято опаковка или защитно фолио е отворено;</li>
            <li>бельото и костюмите, ако хигиенната пломба или опаковката е отворена;</li>
            <li>лубрикантите, козметиката, хапчетата и презервативите с отворена опаковка.</li>
          </ul>
          <p>Неотворените продукти в оригинална, ненарушена опаковка можете да върнете без проблем.</p>
          <h2>Как се връща</h2>
          <ol>
            <li>Пишете ни в 14-дневния срок. Ще ви изпратим адрес за връщане.</li>
            <li>Изпратете продуктите в рамките на 14 дни след като ни уведомите. Разходите за връщане са за ваша сметка.</li>
            <li>
              Връщаме сумата за продуктите и за първоначалната доставка до 14 дни след като получим уведомлението, но можем да изчакаме, докато
              получим самите продукти (чл. 55 от ЗЗП). Възстановяваме по банкова сметка, която ни посочите.
            </li>
          </ol>
          <h2>Образец за отказ</h2>
          <p>
            До {C.name.bg}, {C.address.bg}, {SITE.email}:<br />С настоящото уведомявам, че се отказвам от договора за покупка на следните стоки: …
            Поръчка № … , получена на … . Име на потребителя: … . Адрес: … . IBAN за възстановяване на сумата: … . Дата: … .
          </p>
          <h2>Рекламации</h2>
          <p>
            Всички продукти имат законова гаранция за съответствие от 2 години. Ако продукт пристигне повреден, не работи или не отговаря на
            поръчаното, пишете ни с номера на поръчката и снимка. Ще го заменим, ремонтираме или ще ви върнем парите съгласно закона. Рекламацията
            може да бъде предявена и когато опаковката е отворена.
          </p>
          <h2>Спорове</h2>
          <p>
            Ако не постигнем съгласие, можете да се обърнете към Комисията за защита на потребителите (
            <a href="https://kzp.bg" rel="noopener noreferrer">
              kzp.bg
            </a>
            , тел. 0700 111 22) и към помирителните комисии към нея.
          </p>
        </>
      ),
    },
    discretion: {
      title: "Дискретност",
      description: "Кашон без лого, неутрален подател, без регистрация. Как пазим поръчката ви само между нас.",
      body: (
        <>
          <p>
            Знаем, че това, което поръчвате, е лична работа. Затова пазим поръчката ви между нас от момента, в който натиснете „Поръчай“, до
            момента, в който отворите кашона.
          </p>
          <h2>Опаковката</h2>
          <p>
            Обикновен кафяв кашон или плик. Без името на магазина, без лого, снимки или надписи. Продуктите са опаковани така, че да не се усещат и
            да не тракат.
          </p>
          <h2>Товарителницата</h2>
          <p>
            Подател на пратката е „{SITE.parcelSender.bg}“. В полето за съдържание не пише нищо, което да подсказва какво има вътре. Куриерът
            вижда само име, телефон, адрес и сумата за плащане.
          </p>
          <h2>Сайтът</h2>
          <ul>
            <li>Няма регистрации и профили — не пазим пароли и история на покупките, свързана с акаунт.</li>
            <li>Не използваме рекламни и проследяващи бисквитки. Запомняме само дали сте потвърдили възрастта си и какво има в количката ви.</li>
            <li>Не продаваме и не споделяме данни с рекламни мрежи.</li>
          </ul>
          <h2>Имейлите</h2>
          <p>Ще получите един имейл с потвърждение на поръчката от {SITE.email}. Не изпращаме бюлетини и реклами, освен ако сами не ни помолите.</p>
        </>
      ),
    },
    contact: {
      title: "Контакти",
      description: `Свържете се с ${SITE.name}: ${SITE.email}, ${SITE.phone}.`,
      body: (
        <>
          <p>Отговаряме на въпроси за продукти, размери, поръчки и връщане. Пишете ни свободно — разговорът остава между нас.</p>
          <h2>Как да се свържете с нас</h2>
          <ul>
            <li>
              Имейл: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </li>
            <li>
              Телефон: <a href={`tel:${tel}`}>{SITE.phone}</a>
            </li>
            <li>Работно време: {SITE.hours.bg}</li>
          </ul>
          <h2>Търговец</h2>
          <Seller locale="bg" />
        </>
      ),
    },
    terms: {
      title: "Общи условия",
      description: `Общи условия за ползване на онлайн магазин ${SITE.name} и за покупка на продукти.`,
      body: (
        <>
          <h2>1. Търговец</h2>
          <Seller locale="bg" />
          <h2>2. Предмет и пълнолетие</h2>
          <p>
            Тези общи условия уреждат ползването на сайта {SITE.url.replace(/^https?:\/\//, "")} и покупката на продукти от него. Сайтът и
            продуктите са предназначени <strong>само за лица, навършили 18 години</strong>. С влизането в сайта и с поръчката си потвърждавате, че сте
            пълнолетни.
          </p>
          <h2>3. Продукти и цени</h2>
          <p>
            Цените са в евро и включват ДДС. Цената на доставката се показва отделно преди потвърждаване на поръчката. Снимките са илюстративни;
            цветът и опаковката може леко да се различават. Наличностите се обновяват периодично — ако продукт се окаже изчерпан след поръчката, ще
            ви уведомим и няма да ви таксуваме за него.
          </p>
          <h2>4. Поръчка и договор</h2>
          <p>
            Поръчвате, като добавите продукти в количката, попълните данните за доставка и натиснете „Потвърди поръчката“. Ще получите имейл, че
            поръчката е приета. Договорът се смята за сключен, когато потвърдим поръчката по имейл или телефон.
          </p>
          <h2>5. Доставка и плащане</h2>
          <p>
            Доставката е със Speedy или Еконт за {SHIPPING.days} работни дни, по цените, посочени на страницата{" "}
            <Link href={P.info("delivery")}>Доставка и плащане</Link>. Плащането е с наложен платеж при получаване. Рискът от погиване на стоката
            преминава върху вас, когато получите пратката.
          </p>
          <h2>6. Право на отказ, гаранция и рекламации</h2>
          <p>
            Имате право да се откажете от договора в 14-дневен срок, с изключение на продуктите по чл. 57, т. 5 от ЗЗП (разпечатани хигиенни
            продукти). Подробностите, образецът за отказ и редът за рекламации са на страницата <Link href={P.info("returns")}>Връщане и рекламации</Link>.
          </p>
          <h2>7. Безопасна употреба</h2>
          <p>
            Използвайте продуктите по предназначение и според указанията на производителя. Козметичните продукти и добавките не са лекарства. При
            алергии, бременност или заболяване се консултирайте с лекар преди употреба.
          </p>
          <h2>8. Лични данни</h2>
          <p>
            Обработваме личните ви данни според <Link href={P.info("privacy")}>Политиката за поверителност</Link>.
          </p>
          <h2>9. Спорове</h2>
          <p>
            Спорове решаваме по взаимно съгласие. Можете да се обърнете и към Комисията за защита на потребителите (kzp.bg) и към помирителните
            комисии към нея. Приложимо е българското право.
          </p>
          <h2>10. Промени</h2>
          <p>Можем да променяме тези условия. За всяка поръчка важат условията, публикувани в момента на поръчката.</p>
        </>
      ),
    },
    privacy: {
      title: "Политика за поверителност",
      description: "Какви лични данни събираме при поръчка, защо, колко дълго ги пазим и какви са правата ви.",
      body: (
        <>
          <h2>Администратор на данните</h2>
          <Seller locale="bg" />
          <h2>Какви данни събираме</h2>
          <ul>
            <li>При поръчка: име, телефон, имейл, адрес или офис за доставка, съдържание и сума на поръчката, бележка, ако сте написали.</li>
            <li>Технически: IP адрес при изпращане на поръчка (за защита от злоупотреби), съхраняван временно.</li>
          </ul>
          <p>Нямаме регистрации и профили. Не събираме данни за банкови карти.</p>
          <h2>Защо ги обработваме</h2>
          <ul>
            <li>За да изпълним поръчката ви — чл. 6, пар. 1, б. „б“ от Регламент (ЕС) 2016/679 (GDPR).</li>
            <li>За да спазим счетоводни и данъчни задължения — чл. 6, пар. 1, б. „в“ от GDPR.</li>
            <li>За да отговорим на въпрос, който ни задавате — нашият законен интерес да ви обслужим.</li>
          </ul>
          <h2>На кого ги предаваме</h2>
          <ul>
            <li>На куриера (Speedy или Еконт) — име, телефон, адрес и сума за наложен платеж.</li>
            <li>На доставчиците на хостинг и имейл услуги, които използваме за работата на магазина.</li>
          </ul>
          <p>Не продаваме данни и не ги предоставяме на рекламни мрежи.</p>
          <h2>Колко дълго ги пазим</h2>
          <p>
            Данните за поръчките пазим толкова, колкото изискват счетоводното и данъчното законодателство. Кореспонденцията — до 1 година след
            последното ви писмо.
          </p>
          <h2>Вашите права</h2>
          <p>
            Имате право на достъп, коригиране, изтриване, ограничаване на обработването, преносимост и възражение. Пишете ни на{" "}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. Можете да подадете жалба и до Комисията за защита на личните данни (
            <a href="https://www.cpdp.bg" rel="noopener noreferrer">
              cpdp.bg
            </a>
            ).
          </p>
          <h2>Бисквитки</h2>
          <p>
            Използваме само необходими бисквитки и локално съхранение в браузъра. Вижте <Link href={P.info("cookies")}>Бисквитки</Link>.
          </p>
        </>
      ),
    },
    cookies: {
      title: "Бисквитки",
      description: "Използваме само необходими бисквитки: за потвърждението на възрастта и за количката.",
      body: (
        <>
          <p>Сайтът не използва рекламни, аналитични или проследяващи бисквитки. Затова не ви питаме за съгласие с банер.</p>
          <h2>Какво запомняме</h2>
          <ul>
            <li>
              <strong>kd_age</strong> — бисквитка и запис в браузъра, че сте потвърдили, че сте навършили 18 години. Изтича след 30 дни.
            </li>
            <li>
              <strong>kd_cart_v2</strong> — запис в браузъра (localStorage) с продуктите в количката ви. Остава само на вашето устройство, докато не
              завършите поръчката или не изчистите данните на браузъра.
            </li>
          </ul>
          <p>Те са необходими, за да работи магазинът, и не съдържат лични данни. Можете да ги изтриете по всяко време от настройките на браузъра.</p>
        </>
      ),
    },
    "parental-controls": {
      title: "Родителски контрол",
      description: "Как да блокирате сайтове за възрастни, включително този, на телефона, таблета или компютъра на детето.",
      body: (
        <>
          <p>
            Магазинът е само за пълнолетни. Ако детето ви използва вашия телефон, таблет или компютър, можете да блокирате сайтовете за възрастни —
            включително този — с безплатните инструменти по-долу.
          </p>
          <div className="not-prose mt-8">
            <ParentalControlsGuide locale="bg" tone="day" />
          </div>
        </>
      ),
    },
  };
}

function enPages(): Record<InfoSlug, InfoPage> {
  const P = paths("en");
  const office = price(SHIPPING.methods[0].price, "en");
  const toAddress = price(SHIPPING.methods[2].price, "en");
  const free = price(SHIPPING.freeFrom, "en");
  const C = SITE.company;
  return {
    delivery: {
      title: "Delivery & payment",
      description: `Delivery with Speedy and Econt in ${SHIPPING.days} working days, from ${office}. Free over ${free}. Cash on delivery.`,
      body: (
        <>
          <p>
            We ship across Bulgaria with Speedy and Econt. Every parcel comes in a plain box without logo or labels — more on the{" "}
            <Link href={P.info("discretion")}>Discretion</Link> page.
          </p>
          <h2>Delivery prices</h2>
          <ul>
            <li>To a Speedy or Econt office or locker — {office}</li>
            <li>Courier to your address — {toAddress}</li>
            <li>
              <strong>Free</strong> for orders over {free}
            </li>
          </ul>
          <h2>Delivery time</h2>
          <p>
            Delivery takes {SHIPPING.days} working days after the order is confirmed. Orders placed on a Saturday, Sunday or public holiday are
            processed on the next working day. If a product turns out to be out of stock after you order, we will call you before sending the rest.
          </p>
          <h2>Payment</h2>
          <p>
            You pay cash on delivery — to the courier or at the office when you collect the parcel. You do not need an account and you never enter
            card details on the site. Prices are in euro and include VAT.
          </p>
          <h2>Checking the parcel</h2>
          <p>
            You can check that the parcel is intact before you pay. If the box is damaged, refuse it in front of the courier and call us — we will
            send a new one.
          </p>
        </>
      ),
    },
    returns: {
      title: "Returns & complaints",
      description: "14-day right of withdrawal for unopened products. How to return a product and how to make a complaint.",
      body: (
        <>
          <h2>14-day right of withdrawal</h2>
          <p>
            You can withdraw from your order without giving a reason within 14 days of receiving the products (Art. 50 of the Bulgarian Consumer
            Protection Act). Just email us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with your order number, or use the form below.
          </p>
          <h2>Products that cannot be returned</h2>
          <p>
            Under Art. 57(5) of the Consumer Protection Act, <strong>sealed goods that were unsealed after delivery</strong> and cannot be returned for
            hygiene or health reasons are excluded. In our shop these are:
          </p>
          <ul>
            <li>all intimate toys whose packaging or protective film has been opened;</li>
            <li>lingerie and costumes whose hygiene seal or packaging has been opened;</li>
            <li>lubricants, cosmetics, pills and condoms with opened packaging.</li>
          </ul>
          <p>Unopened products in their original, intact packaging can be returned without any problem.</p>
          <h2>How to return</h2>
          <ol>
            <li>Write to us within the 14 days. We will send you the return address.</li>
            <li>Send the products within 14 days of telling us. Return shipping is at your expense.</li>
            <li>
              We refund the products and the original delivery within 14 days of receiving your notice, but we may wait until we receive the
              products themselves (Art. 55 of the Consumer Protection Act). We refund to the bank account you give us.
            </li>
          </ol>
          <h2>Withdrawal form</h2>
          <p>
            To {C.name.en}, {C.address.en}, {SITE.email}:<br />I hereby give notice that I withdraw from my contract for the following goods: …
            Order No. … , received on … . Name: … . Address: … . IBAN for the refund: … . Date: … .
          </p>
          <h2>Complaints</h2>
          <p>
            All products have a 2-year legal guarantee of conformity. If a product arrives damaged, does not work or is not what you ordered, write to
            us with the order number and a photo. We will replace it, repair it or refund you as the law requires. A complaint can be made even if the
            packaging has been opened.
          </p>
          <h2>Disputes</h2>
          <p>
            If we cannot agree, you can contact the Bulgarian Commission for Consumer Protection (
            <a href="https://kzp.bg" rel="noopener noreferrer">
              kzp.bg
            </a>
            , tel. 0700 111 22) and its conciliation committees.
          </p>
        </>
      ),
    },
    discretion: {
      title: "Discretion",
      description: "A plain box, a neutral sender, no account. How we keep your order between us.",
      body: (
        <>
          <p>We know that what you order is your own business. So we keep your order between us, from the moment you place it to the moment you open the box.</p>
          <h2>The packaging</h2>
          <p>A plain brown box or envelope. No shop name, no logo, no pictures or labels. Products are packed so they cannot be felt or heard rattling.</p>
          <h2>The waybill</h2>
          <p>
            The sender of the parcel is “{SITE.parcelSender.en}”. The contents field says nothing that hints at what is inside. The courier only sees
            a name, phone number, address and the amount to collect.
          </p>
          <h2>The website</h2>
          <ul>
            <li>No accounts or profiles — we keep no passwords and no purchase history tied to an account.</li>
            <li>We use no advertising or tracking cookies. We only remember that you confirmed your age and what is in your cart.</li>
            <li>We do not sell or share data with advertising networks.</li>
          </ul>
          <h2>Emails</h2>
          <p>You will get one email from {SITE.email} confirming your order. We send no newsletters or advertising unless you ask us to.</p>
        </>
      ),
    },
    contact: {
      title: "Contact",
      description: `Get in touch with ${SITE.nameLatin}: ${SITE.email}, ${SITE.phone}.`,
      body: (
        <>
          <p>We answer questions about products, sizes, orders and returns. Write to us freely — the conversation stays between us.</p>
          <h2>How to reach us</h2>
          <ul>
            <li>
              Email: <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </li>
            <li>
              Phone: <a href={`tel:${tel}`}>{SITE.phone}</a>
            </li>
            <li>Working hours: {SITE.hours.en}</li>
          </ul>
          <h2>Seller</h2>
          <Seller locale="en" />
        </>
      ),
    },
    terms: {
      title: "Terms & conditions",
      description: `Terms of use of the ${SITE.nameLatin} online shop and of buying products from it.`,
      body: (
        <>
          <p>
            <em>This is an English translation for your convenience. If the two versions differ, the Bulgarian version prevails.</em>
          </p>
          <h2>1. Seller</h2>
          <Seller locale="en" />
          <h2>2. Scope and age</h2>
          <p>
            These terms govern the use of {SITE.url.replace(/^https?:\/\//, "")} and the purchase of products from it. The site and the products are
            intended <strong>only for people aged 18 or over</strong>. By entering the site and by ordering, you confirm that you are an adult.
          </p>
          <h2>3. Products and prices</h2>
          <p>
            Prices are in euro and include VAT. Delivery is shown separately before you confirm the order. Pictures are for illustration; colour and
            packaging may differ slightly. Stock is updated regularly — if a product turns out to be out of stock after you order, we will let you
            know and will not charge you for it.
          </p>
          <h2>4. Ordering and the contract</h2>
          <p>
            You order by adding products to the cart, filling in your delivery details and pressing “Place order”. You will receive an email that the
            order has been received. The contract is concluded when we confirm the order by email or phone.
          </p>
          <h2>5. Delivery and payment</h2>
          <p>
            Delivery is by Speedy or Econt within {SHIPPING.days} working days, at the prices on the <Link href={P.info("delivery")}>Delivery &amp; payment</Link>{" "}
            page. Payment is cash on delivery. The risk passes to you when you receive the parcel.
          </p>
          <h2>6. Withdrawal, guarantee and complaints</h2>
          <p>
            You may withdraw from the contract within 14 days, except for the products under Art. 57(5) of the Consumer Protection Act (unsealed
            hygiene products). Details, the withdrawal form and how to complain are on the <Link href={P.info("returns")}>Returns &amp; complaints</Link> page.
          </p>
          <h2>7. Safe use</h2>
          <p>
            Use the products as intended and according to the manufacturer&apos;s instructions. Cosmetics and supplements are not medicines. If you
            have allergies, are pregnant or have a medical condition, ask a doctor before use.
          </p>
          <h2>8. Personal data</h2>
          <p>
            We process your personal data as described in the <Link href={P.info("privacy")}>Privacy policy</Link>.
          </p>
          <h2>9. Disputes</h2>
          <p>
            We settle disputes by agreement. You can also contact the Commission for Consumer Protection (kzp.bg) and its conciliation committees.
            Bulgarian law applies.
          </p>
          <h2>10. Changes</h2>
          <p>We may change these terms. Each order is governed by the terms published at the time it was placed.</p>
        </>
      ),
    },
    privacy: {
      title: "Privacy policy",
      description: "What personal data we collect when you order, why, how long we keep it and what your rights are.",
      body: (
        <>
          <h2>Data controller</h2>
          <Seller locale="en" />
          <h2>What we collect</h2>
          <ul>
            <li>When you order: name, phone, email, delivery address or office, the contents and amount of the order, and your note if you wrote one.</li>
            <li>Technical: the IP address when an order is sent (to prevent abuse), kept temporarily.</li>
          </ul>
          <p>We have no accounts or profiles. We do not collect card details.</p>
          <h2>Why we process it</h2>
          <ul>
            <li>To fulfil your order — Art. 6(1)(b) of Regulation (EU) 2016/679 (GDPR).</li>
            <li>To meet accounting and tax obligations — Art. 6(1)(c) GDPR.</li>
            <li>To answer a question you ask us — our legitimate interest in serving you.</li>
          </ul>
          <h2>Who we share it with</h2>
          <ul>
            <li>The courier (Speedy or Econt) — name, phone, address and the cash-on-delivery amount.</li>
            <li>The hosting and email providers we use to run the shop.</li>
          </ul>
          <p>We do not sell data or give it to advertising networks.</p>
          <h2>How long we keep it</h2>
          <p>Order data is kept for as long as accounting and tax law requires. Correspondence is kept for up to 1 year after your last message.</p>
          <h2>Your rights</h2>
          <p>
            You have the right to access, rectification, erasure, restriction of processing, portability and objection. Write to us at{" "}
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>. You can also complain to the Bulgarian Commission for Personal Data Protection (
            <a href="https://www.cpdp.bg" rel="noopener noreferrer">
              cpdp.bg
            </a>
            ).
          </p>
          <h2>Cookies</h2>
          <p>
            We only use necessary cookies and local storage in your browser. See <Link href={P.info("cookies")}>Cookies</Link>.
          </p>
        </>
      ),
    },
    cookies: {
      title: "Cookies",
      description: "We only use necessary cookies: for the age confirmation and for the cart.",
      body: (
        <>
          <p>This site uses no advertising, analytics or tracking cookies. That is why we do not ask for consent with a banner.</p>
          <h2>What we remember</h2>
          <ul>
            <li>
              <strong>kd_age</strong> — a cookie and a browser record that you confirmed you are 18 or older. It expires after 30 days.
            </li>
            <li>
              <strong>kd_cart_v2</strong> — a browser record (localStorage) with the products in your cart. It stays on your device only, until you
              complete the order or clear your browser data.
            </li>
          </ul>
          <p>They are needed for the shop to work and contain no personal data. You can delete them at any time in your browser settings.</p>
        </>
      ),
    },
    "parental-controls": {
      title: "Parental controls",
      description: "How to block adult websites, this one included, on a child's phone, tablet or computer.",
      body: (
        <>
          <p>
            This shop is for adults only. If your child uses your phone, tablet or computer, you can block adult websites — this one included — with the
            free tools below.
          </p>
          <div className="not-prose mt-8">
            <ParentalControlsGuide locale="en" tone="day" />
          </div>
        </>
      ),
    },
  };
}

export function getInfoPage(slug: string, locale: Locale): InfoPage | undefined {
  if (!(INFO_SLUGS as readonly string[]).includes(slug)) return undefined;
  return (locale === "bg" ? bgPages() : enPages())[slug as InfoSlug];
}
