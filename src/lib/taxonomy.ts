// Shop structure shared by the import script and the storefront, in both languages.
// Category names follow the Bulgarian market leaders (sexwell.bg, lovex.bg, passion.bg, sexo.bg); the English names
// use the usual adult-retail terms. Ids are also the URL slugs in both languages: renaming one breaks old links.

import type { Locale } from "@/i18n/config";

export type L = Record<Locale, string>;

export type Sub = { id: string; name: L };

export type Category = {
  id: string;
  name: L;
  /** Shorter label for the desktop category bar, when the full name is long. */
  short?: L;
  lede: L;
  subs: Sub[];
  /** General guidance shown on every product page of the category. Must stay true for every product in it. */
  about: L;
  care: Record<Locale, string[]>;
};

const s = (id: string, bg: string, en: string): Sub => ({ id, name: { bg, en } });

export const CATEGORIES: Category[] = [
  {
    id: "vibrators",
    name: { bg: "Вибратори", en: "Vibrators" },
    lede: {
      bg: "От дискретни булети до въздушна стимулация и играчки, които се управляват от телефона.",
      en: "From discreet bullets to air-pulse stimulators and toys you control from your phone.",
    },
    subs: [
      s("air-pulse", "Въздушна стимулация", "Air Pulse Stimulators"),
      s("rabbit-vibrators", "Вибратор заек", "Rabbit Vibrators"),
      s("g-spot-vibrators", "Вибратори за G-точка", "G-Spot Vibrators"),
      s("clitoral-vibrators", "Клитор стимулатори", "Clitoral Vibrators"),
      s("bullet-vibrators", "Булети и мини вибратори", "Bullets & Mini Vibrators"),
      s("finger-vibrators", "Вибро напръстник", "Finger Vibrators"),
      s("wand-massagers", "Масажори", "Wand Massagers"),
      s("remote-app", "С дистанционно и приложение", "Remote & App-Controlled"),
      s("realistic-vibrators", "Реалистични вибратори", "Realistic Vibrators"),
      s("thrusting-vibrators", "Тласкащи и пулсатори", "Thrusting & Pulsating"),
      s("eggs-kegel-balls", "Вибро яйца и вагинални топчета", "Vibrating Eggs & Kegel Balls"),
      s("classic-vibrators", "Класически вибратори", "Classic Vibrators"),
    ],
    about: {
      bg: "Вибраторите се различават най-вече по форма, сила и вид на стимулацията. Ако тепърва започвате, изберете по-малък модел с няколко режима и меко покритие.",
      en: "Vibrators differ mostly in shape, power and the kind of stimulation. If you are new to them, choose a smaller model with several modes and a soft finish.",
    },
    care: {
      bg: [
        "Почистете преди и след употреба с топла вода и мек сапун или със спрей за играчки.",
        "С играчки от силикон използвайте лубрикант на водна основа.",
        "Презареждащите се модели зареждайте само с оригиналния кабел.",
        "Съхранявайте сухи, в торбичка, отделно от други играчки.",
      ],
      en: [
        "Clean before and after use with warm water and mild soap, or with a toy cleaner spray.",
        "Use a water-based lubricant with silicone toys.",
        "Charge rechargeable models only with the original cable.",
        "Store dry, in a pouch, away from other toys.",
      ],
    },
  },
  {
    id: "dildos",
    name: { bg: "Дилда", en: "Dildos" },
    lede: {
      bg: "Реалистични, стъклени, двойни и XXL дилда — с акцент върху формата и материала.",
      en: "Realistic, glass, double and XXL dildos — all about shape and material.",
    },
    subs: [
      s("realistic-dildos", "Реалистични дилда", "Realistic Dildos"),
      s("suction-cup-dildos", "С вакуум чашка", "Suction Cup Dildos"),
      s("double-dildos", "Двойни дилда", "Double Dildos"),
      s("glass-metal-dildos", "Стъклени и метални дилда", "Glass & Metal Dildos"),
      s("xxl-dildos", "XXL дилда", "XXL Dildos"),
      s("vibrating-dildos", "Вибриращи дилда", "Vibrating Dildos"),
      s("fantasy-dildos", "Нестандартни дилда", "Fantasy Dildos"),
      s("classic-dildos", "Класически дилда", "Classic Dildos"),
    ],
    about: {
      bg: "При дилдото най-важни са размерът и материалът. Сравнете дължината и диаметъра с нещо познато, преди да изберете, и започнете с по-скромен размер.",
      en: "With a dildo, size and material matter most. Compare the length and width with something familiar before you choose, and start with a modest size.",
    },
    care: {
      bg: [
        "Почистете преди и след употреба с топла вода и мек сапун или със спрей за играчки.",
        "Използвайте достатъчно лубрикант. При силикон избирайте такъв на водна основа.",
        "Стъклените и металните модели проверявайте за пукнатини и драскотини преди употреба.",
        "Съхранявайте отделно от други играчки, за да не се залепват материалите.",
      ],
      en: [
        "Clean before and after use with warm water and mild soap, or with a toy cleaner spray.",
        "Use plenty of lubricant. With silicone, choose a water-based one.",
        "Check glass and metal models for cracks and scratches before use.",
        "Store apart from other toys so the materials do not stick together.",
      ],
    },
  },
  {
    id: "anal-toys",
    name: { bg: "Анални играчки", en: "Anal Toys" },
    short: { bg: "Анални", en: "Anal Toys" },
    lede: {
      bg: "Разширители, броеници, анални бижута и простатни стимулатори. Винаги с широка основа за безопасна употреба.",
      en: "Butt plugs, beads, jeweled plugs and prostate massagers. Always with a flared base for safe play.",
    },
    subs: [
      s("butt-plugs", "Анални разширители", "Butt Plugs"),
      s("jeweled-tail-plugs", "Анални бижута и опашки", "Jeweled & Tail Plugs"),
      s("vibrating-plugs", "Вибриращи разширители", "Vibrating Butt Plugs"),
      s("anal-beads", "Анални броеници", "Anal Beads"),
      s("prostate-massagers", "Простатни стимулатори", "Prostate Massagers"),
      s("anal-dildos-vibrators", "Анални дилда и вибратори", "Anal Dildos & Vibrators"),
      s("anal-kits", "Анални комплекти", "Anal Training Kits"),
      s("anal-douches", "Анални душове", "Anal Douches"),
    ],
    about: {
      bg: "За анална употреба избирайте само играчки с разширена основа или халка. Бавното темпо и обилното количество лубрикант са задължителни.",
      en: "For anal play, only use toys with a flared base or a ring. Go slowly and use plenty of lubricant.",
    },
    care: {
      bg: [
        "Използвайте само играчки с широка основа или халка, които не могат да навлязат изцяло.",
        "Комбинирайте с гъст лубрикант. При силиконови играчки — на водна основа.",
        "Почиствайте старателно след всяка употреба. Не прехвърляйте директно към вагинална употреба.",
        "Спрете при болка. Дискомфортът е сигнал да забавите или да изберете по-малък размер.",
      ],
      en: [
        "Only use toys with a flared base or a ring that cannot slip in completely.",
        "Combine with a thick lubricant. With silicone toys, use a water-based one.",
        "Clean thoroughly after every use. Never switch straight to vaginal use.",
        "Stop if it hurts. Discomfort is a sign to slow down or choose a smaller size.",
      ],
    },
  },
  {
    id: "masturbators",
    name: { bg: "Мастурбатори", en: "Masturbators" },
    lede: {
      bg: "Изкуствени вагини, анус мастурбатори, Tenga, автоматични модели и секс кукли.",
      en: "Pocket pussies, butt strokers, Tenga, automatic strokers and sex dolls.",
    },
    subs: [
      s("pocket-pussies", "Изкуствени вагини", "Pocket Pussies"),
      s("butt-masturbators", "Анус мастурбатори", "Butt Masturbators"),
      s("vibrating-masturbators", "Вибро мастурбатори", "Vibrating Masturbators"),
      s("automatic-masturbators", "Автоматични мастурбатори", "Automatic Masturbators"),
      s("masturbator-eggs", "Яйца за мастурбация", "Masturbator Eggs"),
      s("discreet-strokers", "Дискретни мастурбатори", "Discreet Strokers"),
      s("sex-dolls", "Секс кукли", "Sex Dolls"),
      s("classic-strokers", "Класически мастурбатори", "Classic Strokers"),
    ],
    about: {
      bg: "Мастурбаторите се използват с лубрикант на водна основа. Повечето се почистват с топла вода и трябва да изсъхнат напълно, преди да се приберат.",
      en: "Masturbators are used with a water-based lubricant. Most are rinsed with warm water and must dry completely before you put them away.",
    },
    care: {
      bg: [
        "Използвайте лубрикант на водна основа, освен ако производителят не посочва друго.",
        "След употреба изплакнете с топла вода и оставете да изсъхне напълно, преди да приберете.",
        "Пудрата за поддръжка запазва материала мек и приятен на допир.",
        "Моделите за еднократна употреба (например яйцата Tenga) не се използват повторно.",
      ],
      en: [
        "Use a water-based lubricant unless the manufacturer says otherwise.",
        "Rinse with warm water after use and let it dry completely before putting it away.",
        "Renewing powder keeps the material soft and pleasant to the touch.",
        "Single-use models (such as Tenga eggs) are not meant to be used again.",
      ],
    },
  },
  {
    id: "penis-enhancement",
    name: { bg: "Уголемяване на пенис", en: "Penis Enhancement" },
    short: { bg: "Уголемяване", en: "Enhancement" },
    lede: {
      bg: "Пенис помпи, ръкави и удължители, пенис рингове и вибро рингове.",
      en: "Penis pumps, sleeves and extenders, cock rings and vibrating rings.",
    },
    subs: [
      s("penis-pumps", "Пенис помпи", "Penis Pumps"),
      s("sleeves-extenders", "Пенис ръкави и удължители", "Sleeves & Extenders"),
      s("cock-rings", "Пенис рингове", "Cock Rings"),
      s("vibrating-cock-rings", "Вибро рингове", "Vibrating Cock Rings"),
      s("creams-pills", "Кремове и хапчета", "Creams & Pills"),
    ],
    about: {
      bg: "Пенис рингът не се носи повече от 20–30 минути наведнъж. При помпите увеличавайте вакуума постепенно и спрете при болка или изтръпване.",
      en: "Never wear a cock ring for more than 20–30 minutes at a time. With pumps, build the vacuum gradually and stop if you feel pain or numbness.",
    },
    care: {
      bg: [
        "Сваляйте пенис ринга до 30 минути, а при изтръпване или болка — веднага.",
        "При помпите увеличавайте вакуума постепенно.",
        "Използвайте лубрикант на водна основа.",
        "При заболяване, прием на разредители на кръвта или проблеми с кръвообращението първо се консултирайте с лекар.",
      ],
      en: [
        "Take a cock ring off within 30 minutes, and at once if you feel numbness or pain.",
        "With pumps, build the vacuum gradually.",
        "Use a water-based lubricant.",
        "If you have a medical condition, take blood thinners or have circulation problems, ask a doctor first.",
      ],
    },
  },
  {
    id: "couples",
    name: { bg: "За двама", en: "Couples" },
    lede: {
      bg: "Вибратори за двойки, пенис колани, игри, подаръчни комплекти и секс мебели.",
      en: "Couples vibrators, strap-ons, games, gift sets and sex furniture.",
    },
    subs: [
      s("couples-vibrators", "Вибратори за двойки", "Couples Vibrators"),
      s("strap-ons", "Пенис колани", "Strap-On Harnesses"),
      s("strap-on-dildos", "Страпон и страплес дилда", "Strap-On & Strapless Dildos"),
      s("sex-games", "Игри за двойки", "Sex Games"),
      s("party-gifts", "Парти и забавни подаръци", "Party & Gag Gifts"),
      s("gift-sets", "Подаръчни комплекти", "Gift Sets"),
      s("machines-furniture", "Секс машини и мебели", "Sex Machines & Furniture"),
    ],
    about: {
      bg: "Играчките за двама работят най-добре, когато ги изберете заедно. Говорете предварително какво искате да опитате и си дайте време да свикнете.",
      en: "Toys for two work best when you choose them together. Talk about what you want to try beforehand and give yourselves time.",
    },
    care: {
      bg: [
        "Почистете преди и след употреба според материала.",
        "Използвайте лубрикант, съвместим с материала на играчката.",
        "Проверявайте ремъците и закопчалките преди всяка употреба.",
      ],
      en: [
        "Clean before and after use according to the material.",
        "Use a lubricant that suits the material of the toy.",
        "Check straps and buckles before every use.",
      ],
    },
  },
  {
    id: "bdsm",
    name: { bg: "BDSM", en: "BDSM & Bondage" },
    short: { bg: "BDSM", en: "BDSM" },
    lede: {
      bg: "Белезници, маски, камшици, яки и комплекти — от лек флирт до сериозна игра. Винаги с договорена стоп дума.",
      en: "Cuffs, masks, whips, collars and kits — from light teasing to serious play. Always with an agreed safe word.",
    },
    subs: [
      s("restraints", "Белезници и въжета", "Cuffs & Restraints"),
      s("masks-blindfolds", "Маски и превръзки", "Masks & Blindfolds"),
      s("whips-paddles", "Камшици и бичове", "Whips & Paddles"),
      s("gags", "Топки за уста", "Gags"),
      s("nipple-play", "Щипки и помпи", "Clamps & Pumps"),
      s("sensation-play", "Аксесоари за сетивата", "Sensation Play"),
      s("electro-stimulation", "Електростимулация", "Electro-Stimulation"),
      s("collars-leashes", "Яки и каишки", "Collars & Leashes"),
      s("chastity", "Пенис клетки", "Chastity Cages"),
      s("bondage-kits", "BDSM комплекти", "Bondage Kits"),
    ],
    about: {
      bg: "Договорете границите и стоп дума предварително. Не оставяйте вързан партньор без надзор и дръжте наблизо начин бързо да освободите белезниците или въжето.",
      en: "Agree on limits and a safe word in advance. Never leave a restrained partner alone, and keep a way to release cuffs or rope quickly within reach.",
    },
    care: {
      bg: [
        "Договорете стоп дума и я уважавайте без въпроси.",
        "Не затягайте около врата и ставите. Проверявайте кръвообращението на всеки няколко минути.",
        "Кожените аксесоари почиствайте с влажна кърпа, а не с вода.",
        "Не използвайте топка за уста, ако партньорът има затруднено дишане през носа.",
      ],
      en: [
        "Agree on a safe word and respect it without question.",
        "Never tighten anything around the neck or joints. Check circulation every few minutes.",
        "Wipe leather accessories with a damp cloth; do not soak them.",
        "Do not use a gag if your partner has trouble breathing through the nose.",
      ],
    },
  },
  {
    id: "lingerie",
    name: { bg: "Еротично бельо", en: "Lingerie" },
    short: { bg: "Бельо", en: "Lingerie" },
    lede: {
      bg: "Дантела, мрежа, сатен, латекс и ролеви костюми. Бельо, което се носи за двама — или само за себе си.",
      en: "Lace, fishnet, satin, latex and roleplay costumes. Lingerie to wear for two — or just for yourself.",
    },
    subs: [
      s("bodysuits", "Бодита", "Bodysuits & Teddies"),
      s("bodystockings", "Мрежи за тяло", "Bodystockings"),
      s("lingerie-sets", "Секси комплекти", "Lingerie Sets"),
      s("dresses-chemises", "Рокли и нощници", "Dresses & Chemises"),
      s("bras", "Сутиени", "Bras"),
      s("corsets-bustiers", "Корсети и бюстиета", "Corsets & Bustiers"),
      s("panties-thongs", "Бикини и прашки", "Panties & Thongs"),
      s("stockings", "Чорапи и чорапогащници", "Stockings & Tights"),
      s("garter-belts", "Жартиерни колани", "Garter Belts"),
      s("costumes", "Еротични костюми", "Costumes & Roleplay"),
      s("fetish-latex", "Фетиш и латекс", "Fetish & Latex Wear"),
      s("mens-lingerie", "Бельо за мъже", "Men's Lingerie"),
      s("accessories", "Ръкавици и аксесоари", "Gloves & Accessories"),
    ],
    about: {
      bg: "Размерът е посочен в името на продукта, когато производителят го е обявил. Ако се колебаете между два размера, изберете по-големия — еротичното бельо обикновено е по-тясно.",
      en: "The size is in the product name when the manufacturer states it. If you are between two sizes, choose the larger one — erotic lingerie usually runs small.",
    },
    care: {
      bg: [
        "Перете на ръка в хладка вода с мек препарат.",
        "Не изцеждайте и не сушете в сушилня. Сушете на сянка.",
        "Бельото е хигиенен продукт: след като пломбата е отворена, не подлежи на връщане.",
      ],
      en: [
        "Hand wash in lukewarm water with a mild detergent.",
        "Do not wring or tumble dry. Dry in the shade.",
        "Lingerie is a hygiene product: once the seal is opened, it cannot be returned.",
      ],
    },
  },
  {
    id: "lube",
    name: { bg: "Лубриканти", en: "Lube" },
    lede: {
      bg: "На водна и силиконова основа, с вкус, затоплящи и анални лубриканти.",
      en: "Water-based, silicone-based, flavored, warming and anal lubricants.",
    },
    subs: [
      s("water-based", "На водна основа", "Water-Based"),
      s("silicone-based", "Силиконова основа", "Silicone-Based"),
      s("flavored", "Лубриканти с вкус", "Flavored"),
      s("warming-cooling", "Затоплящи и охлаждащи", "Warming & Cooling"),
      s("anal-lube", "Анални лубриканти", "Anal Lube"),
      s("personal-lubricants", "Лубриканти за секс", "Personal Lubricants"),
    ],
    about: {
      bg: "Лубрикантите на водна основа са съвместими с всички играчки и презервативи. Силиконовите издържат по-дълго, но не се използват със силиконови играчки. Маслата повреждат латексовите презервативи.",
      en: "Water-based lubricants work with every toy and condom. Silicone-based ones last longer but should not be used with silicone toys. Oils damage latex condoms.",
    },
    care: {
      bg: [
        "Преди първа употреба тествайте върху малък участък кожа.",
        "Не използвайте масла и продукти на маслена основа с латексови презервативи.",
        "Пазете от деца, на сухо място, далеч от пряка слънчева светлина.",
      ],
      en: [
        "Test on a small patch of skin before first use.",
        "Do not use oils or oil-based products with latex condoms.",
        "Keep away from children, in a dry place, out of direct sunlight.",
      ],
    },
  },
  {
    id: "sexual-wellness",
    name: { bg: "Секс аптека", en: "Sexual Wellness" },
    short: { bg: "Секс аптека", en: "Wellness" },
    lede: {
      bg: "Възбуждащи и задържащи продукти, испанска муха, масажни масла, феромони и грижа за играчките.",
      en: "Arousal and delay products, Spanish fly, massage oils, pheromones and toy care.",
    },
    subs: [
      s("arousal", "Възбуждащи", "Arousal Gels & Drops"),
      s("delay", "Задържащи", "Delay Sprays & Creams"),
      s("spanish-fly", "Испанска муха", "Spanish Fly"),
      s("massage", "Масажни масла и свещи", "Massage Oils & Candles"),
      s("pheromones", "Парфюми с феромони", "Pheromone Perfumes"),
      s("supplements", "Хапчета и добавки", "Pills & Supplements"),
      s("toy-care", "Почистване и поддръжка", "Toy Cleaners & Care"),
      s("intimate-care", "Интимна хигиена", "Intimate Care"),
    ],
    about: {
      bg: "Козметиката за интимна употреба е за външно приложение, освен ако на опаковката не пише друго. Добавките не са лекарства и не заместват консултацията с лекар.",
      en: "Intimate cosmetics are for external use unless the packaging says otherwise. Supplements are not medicines and do not replace medical advice.",
    },
    care: {
      bg: [
        "Преди първа употреба тествайте върху малък участък кожа.",
        "Не използвайте масла и продукти на маслена основа с латексови презервативи.",
        "Пазете от деца, на сухо място, далеч от пряка слънчева светлина.",
        "Хранителните добавки не са заместител на разнообразното хранене. При заболяване се консултирайте с лекар.",
      ],
      en: [
        "Test on a small patch of skin before first use.",
        "Do not use oils or oil-based products with latex condoms.",
        "Keep away from children, in a dry place, out of direct sunlight.",
        "Food supplements do not replace a varied diet. If you have a medical condition, ask a doctor.",
      ],
    },
  },
  {
    id: "condoms",
    name: { bg: "Презервативи", en: "Condoms" },
    lede: {
      bg: "Тънки, релефни, с вкус и в големи размери. Durex, Ritex, One Touch, MY.SIZE и още.",
      en: "Ultra thin, ribbed, flavored and large size. Durex, Ritex, One Touch, MY.SIZE and more.",
    },
    subs: [
      s("ultra-thin", "Тънки", "Ultra Thin"),
      s("textured", "Релефни и стимулиращи", "Ribbed & Textured"),
      s("flavored-condoms", "С вкус и цвят", "Flavored & Colored"),
      s("large-condoms", "Големи размери", "Large Size"),
      s("classic-condoms", "Класически", "Classic"),
    ],
    about: {
      bg: "Презервативът е единственото средство, което пази едновременно от бременност и от полово предавани инфекции. Проверявайте срока на годност и използвайте само лубрикант на водна или силиконова основа.",
      en: "Condoms are the only method that protects against both pregnancy and sexually transmitted infections. Check the expiry date and only use water- or silicone-based lubricant.",
    },
    care: {
      bg: [
        "Проверявайте срока на годност и целостта на опаковката.",
        "Не използвайте с масла и лосиони на маслена основа.",
        "Съхранявайте на хладно, далеч от остри предмети.",
        "Един презерватив — за еднократна употреба.",
      ],
      en: [
        "Check the expiry date and that the wrapper is intact.",
        "Do not use with oils or oil-based lotions.",
        "Store in a cool place, away from sharp objects.",
        "One condom, one use.",
      ],
    },
  },
];

export const CATEGORY_BY_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

export function findSub(categoryId: string, subId: string): Sub | undefined {
  return CATEGORY_BY_ID.get(categoryId)?.subs.find((x) => x.id === subId);
}

export type AudienceId = "her" | "him";

export const AUDIENCES: { id: AudienceId; name: L; lede: L }[] = [
  {
    id: "her",
    name: { bg: "За нея", en: "For Her" },
    lede: {
      bg: "Вибратори, вагинални топчета, бельо и козметика, подбрани с мисъл за женското удоволствие.",
      en: "Vibrators, kegel balls, lingerie and cosmetics chosen with female pleasure in mind.",
    },
  },
  {
    id: "him",
    name: { bg: "За него", en: "For Him" },
    lede: {
      bg: "Мастурбатори, пенис рингове и помпи, простатни стимулатори и козметика за мъже.",
      en: "Masturbators, cock rings and pumps, prostate massagers and cosmetics for men.",
    },
  },
];

export const AUDIENCE_BY_ID = new Map(AUDIENCES.map((a) => [a.id, a]));
