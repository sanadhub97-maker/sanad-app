/**
 * Professional Arabic Name Transliteration Engine
 * 
 * Accurately transliterates Arabic personal and tribal names to Latin script
 * conforming to Saudi Passport, Civil Affairs, and GCC naming standards.
 */

// Common compound name prefixes (sorted from longest to shortest during lookup)
const COMPOUND_PREFIXES: Record<string, string> = {
  // Abd + 99 Names of Allah & Arabic Attributes
  "عبدالله": "Abdullah",
  "عبد الله": "Abdullah",
  "عبدالرحمن": "Abdulrahman",
  "عبد الرحمن": "Abdulrahman",
  "عبدالعزيز": "Abdulaziz",
  "عبد العزيز": "Abdulaziz",
  "عبدالملك": "Abdulmalik",
  "عبد الملك": "Abdulmalik",
  "عبدالمجيد": "Abdulmajeed",
  "عبد المجيد": "Abdulmajeed",
  "عبداللطيف": "Abdullatif",
  "عبد اللطيف": "Abdullatif",
  "عبدالمحسن": "Abdulmohsen",
  "عبد المحسن": "Abdulmohsen",
  "عبدالكريم": "Abdulkarim",
  "عبد الكريم": "Abdulkarim",
  "عبدالقادر": "Abdulqader",
  "عبد القادر": "Abdulqader",
  "عبدالفتاح": "Abdulfattah",
  "عبد الفتاح": "Abdulfattah",
  "عبدالسلام": "Abdulsalam",
  "عبد السلام": "Abdulsalam",
  "عبدالوهاب": "Abdulwahab",
  "عبد الوهاب": "Abdulwahab",
  "عبدالإله": "Abdulilah",
  "عبد الإله": "Abdulilah",
  "عبدالاله": "Abdulilah",
  "عبد الاله": "Abdulilah",
  "عبدالمنعم": "Abdulmonem",
  "عبد المنعم": "Abdulmonem",
  "عبدالرزاق": "Abdulrazzaq",
  "عبد الرزاق": "Abdulrazzaq",
  "عبدالهادي": "Abdulhadi",
  "عبد الهادي": "Abdulhadi",
  "عبدالصمد": "Abdulsamad",
  "عبد الصمد": "Abdulsamad",
  "عبدالباري": "Abdulbari",
  "عبد الباري": "Abdulbari",
  "عبدالباسط": "Abdulbaset",
  "عبد الباسط": "Abdulbaset",
  "عبدالغني": "Abdulghani",
  "عبد الغني": "Abdulghani",
  "عبدالحليم": "Abdulhaleem",
  "عبد الحليم": "Abdulhaleem",
  "عبدالحفيظ": "Abdulhafeez",
  "عبد الحفيظ": "Abdulhafeez",
  "عبدالرحيم": "Abdulraheem",
  "عبد الرحيم": "Abdulraheem",
  "عبدالخالق": "Abdulkhaleq",
  "عبد الخالق": "Abdulkhaleq",
  "عبدالجليل": "Abduljaleel",
  "عبد الجليل": "Abduljaleel",
  "عبدالغفور": "Abdulghafoor",
  "عبد الغفور": "Abdulghafoor",
  "عبدالشكور": "Abdulshakoor",
  "عبد الشكور": "Abdulshakoor",
  "عبدالودود": "Abdulwadood",
  "عبد الودود": "Abdulwadood",
  "عبدالرؤوف": "Abdulraouf",
  "عبد الرؤوف": "Abdulraouf",
  "عبدالحميد": "Abdulhamid",
  "عبد الحميد": "Abdulhamid",
  "عبدالناصر": "Abdel Nasser",
  "عبد الناصر": "Abdel Nasser",
  "عبدالعال": "Abdel Aal",
  "عبد العال": "Abdel Aal",
  "عبدربه": "Abd Rabbo",
  "عبد ربه": "Abd Rabbo",
  "عبدالجواد": "Abdel Gawad",
  "عبد الجواد": "Abdel Gawad",
  "عبدالمولى": "Abdel Mawla",
  "عبد المولى": "Abdel Mawla",
  "عبدالنبي": "Abdel Nabi",
  "عبد النبي": "Abdel Nabi",
  "عبدالرسول": "Abdel Rasoul",
  "عبد الرسول": "Abdel Rasoul",
  "عبدالحكيم": "Abdel Hakeem",
  "عبد الحكيم": "Abdel Hakeem",
  "عبدالباقي": "Abdel Baqi",
  "عبد الباقي": "Abdel Baqi",
  "عبدالصاحب": "Abdel Saheb",
  "عبد الصاحب": "Abdel Saheb",
  "عبدالستار": "Abdel Sattar",
  "عبد الستار": "Abdel Sattar",
  "عبدالغفار": "Abdel Ghaffar",
  "عبد الغفار": "Abdel Ghaffar",
  "عبدالحق": "Abdel Haq",
  "عبد الحق": "Abdel Haq",
  "عبدالدايم": "Abdel Dayem",
  "عبد الدايم": "Abdel Dayem",
  "عبدالعظيم": "Abdel Azeem",
  "عبد العظيم": "Abdel Azeem",
  "عبدالصبور": "Abdel Saboor",
  "عبد الصبور": "Abdel Saboor",

  // Din Compounds
  "سيف الدين": "Saif Eldin",
  "سيفالدين": "Saif Eldin",
  "نور الدين": "Nour Eldin",
  "نورالدين": "Nour Eldin",
  "حسام الدين": "Hossam Eldin",
  "حسامالدين": "Hossam Eldin",
  "عماد الدين": "Emad Eldin",
  "عمادالدين": "Emad Eldin",
  "ضياء الدين": "Diya Eldin",
  "ضياءالدين": "Diya Eldin",
  "بهاء الدين": "Bahaa Eldin",
  "بهاءالدين": "Bahaa Eldin",
  "علاء الدين": "Alaa Eldin",
  "علاءالدين": "Alaa Eldin",
  "صلاح الدين": "Salah Eldin",
  "صلاحالدين": "Salah Eldin",
  "جمال الدين": "Gamal Eldin",
  "جمالدين": "Gamal Eldin",
  "شمس الدين": "Shams Eldin",
  "شمسالدين": "Shams Eldin",
  "بدر الدين": "Badr Eldin",
  "بدرالدين": "Badr Eldin",
  "شرف الدين": "Sharaf Eldin",
  "شرفالدين": "Sharaf Eldin",
  "عز الدين": "Ezz Eldin",
  "عزالدين": "Ezz Eldin",
  "نجم الدين": "Najm Eldin",
  "نجمالدين": "Najm Eldin",
  "تقي الدين": "Taqi Eldin",
  "تقيالدين": "Taqi Eldin",
  "محي الدين": "Mohy Eldin",
  "محيالدين": "Mohy Eldin",
  "محيي الدين": "Mohy Eldin",
  "محييالدين": "Mohy Eldin",
  "زين الدين": "Zain Eldin",
  "زينالدين": "Zain Eldin",
  "كمال الدين": "Kamal Eldin",
  "كمالالدين": "Kamal Eldin",
  "خير الدين": "Kheir Eldin",
  "خيرالدين": "Kheir Eldin",

  // Allah / Islam Compounds
  "فضل الله": "Fadlallah",
  "فضلالله": "Fadlallah",
  "سيف الله": "Saifullah",
  "سيفالله": "Saifullah",
  "عطاء الله": "Ataallah",
  "عطاءالله": "Ataallah",
  "فتح الله": "Fathallah",
  "فتحالله": "Fathallah",
  "نصر الله": "Nasrallah",
  "نصرالله": "Nasrallah",
  "حبيب الله": "Habibullah",
  "حبيبالله": "Habibullah",
  "رحمة الله": "Rahmatullah",
  "رحمةالله": "Rahmatullah",
  "نعمة الله": "Nematullah",
  "نعمةالله": "Nematullah",
  "هبة الله": "Hibatullah",
  "هبةالله": "Hibatullah",
  "أمان الله": "Amanullah",
  "امان الله": "Amanullah",
  "جاد الله": "Gadallah",
  "جادالله": "Gadallah",
  "سيف الإسلام": "Saif Alislam",
  "سيف الاسلام": "Saif Alislam",
  "نور الإسلام": "Nour Alislam",
  "نور الاسلام": "Nour Alislam",

  // Abu Compounds
  "أبو بكر": "Abu Bakr",
  "أبوبكر": "Abu Bakr",
  "ابو بكر": "Abu Bakr",
  "ابوبكر": "Abu Bakr",
  "أبو طالب": "Abu Talib",
  "ابو طالب": "Abu Talib",
  "أبو الفتوح": "Aboul Fotouh",
  "ابو الفتوح": "Aboul Fotouh",
  "أبو النجا": "Aboul Naga",
  "ابو النجا": "Aboul Naga",
  "أبو الخير": "Aboul Kheir",
  "ابو الخير": "Aboul Kheir",
  "أبو العز": "Aboul Ezz",
  "ابو العز": "Aboul Ezz",
  "أبو الوفا": "Aboul Wafa",
  "ابو الوفا": "Aboul Wafa",
  "أبو المجد": "Aboul Magd",
  "ابو المجد": "Aboul Magd",
  "أبو زيد": "Abu Zaid",
  "ابو زيد": "Abu Zaid",
  "أم كلثوم": "Um Kulthum",
  "ام كلثوم": "Um Kulthum",

  // Bin & Family Prefix Compounds
  "بن لادن": "Bin Laden",
  "بن محفوظ": "Bin Mahfouz",
  "بن سلمان": "Bin Salman",
  "بن زايد": "Bin Zayed",
  "بن راشد": "Bin Rashid",
  "آل سعود": "Al Saud",
  "آل الشيخ": "Al Sheikh",
  "آل ثاني": "Al Thani",
  "آل نهيان": "Al Nahyan",
  "آل مكتوم": "Al Maktoum",
  "آل خليفة": "Al Khalifa",
  "آل صباح": "Al Sabah",
};

// Common Arabic Given Names & Family Names Dictionary
const NAME_DICTIONARY: Record<string, string> = {
  // Relational & Connectors
  "بن": "Bin",
  "ابن": "Ibn",
  "بنت": "Bint",
  "آل": "Al",
  "ال": "Al-",
  "أبو": "Abu",
  "ابو": "Abu",
  "أم": "Um",
  "ام": "Um",

  // Male Given Names
  "محمد": "Mohammed",
  "محمود": "Mahmoud",
  "أحمد": "Ahmed",
  "احمد": "Ahmed",
  "مصطفى": "Mustafa",
  "علي": "Ali",
  "عمر": "Omar",
  "عمرو": "Amr",
  "عثمان": "Othman",
  "عادل": "Adel",
  "عصام": "Essam",
  "عارف": "Aref",
  "عامر": "Amer",
  "عاطف": "Atef",
  "عباس": "Abbas",
  "عوني": "Awni",
  "عيسى": "Issa",
  "عاصم": "Asim",
  "عزيز": "Aziz",
  "عزمي": "Azmi",
  "عطا": "Ata",
  "عطية": "Attia",
  "عفيف": "Afif",
  "عقيل": "Aqeel",
  "علاء": "Alaa",
  "علام": "Allam",
  "عليان": "Olayan",
  "عماد": "Emad",
  "عمار": "Ammar",
  "عمران": "Omran",
  "عنان": "Anan",
  "عوض": "Awad",
  "عيد": "Eid",
  "سعد": "Saad",
  "سعود": "Saud",
  "سالم": "Salem",
  "سلمان": "Salman",
  "سعيد": "Saeed",
  "سليمان": "Sulaiman",
  "سامي": "Sami",
  "سمير": "Samir",
  "سيف": "Saif",
  "سهيل": "Suhail",
  "سامر": "Samer",
  "سراج": "Siraj",
  "سيد": "Sayed",
  "السيد": "Alsayed",
  "سري": "Serry",
  "سنان": "Sinan",
  "ساهر": "Saher",
  "سفيان": "Sufyan",
  "سليم": "Saleem",
  "سلام": "Salam",
  "سلامة": "Salama",
  "سلطان": "Sultan",
  "خالد": "Khalid",
  "وليد": "Waleed",
  "فيصل": "Faisal",
  "فهد": "Fahad",
  "فارس": "Faris",
  "فؤاد": "Fouad",
  "فراس": "Firas",
  "فاضل": "Fadel",
  "فايز": "Fayez",
  "فتحي": "Fathi",
  "فريد": "Farid",
  "فاروق": "Farooq",
  "فخري": "Fakhry",
  "فهمي": "Fahmy",
  "فادي": "Fadi",
  "فلاح": "Falah",
  "فوزي": "Fawzy",
  "فرج": "Faraj",
  "فرحان": "Farhan",
  "بندر": "Bandar",
  "مشعل": "Meshal",
  "تركي": "Turki",
  "نايف": "Nayef",
  "نائف": "Nayef",
  "نواف": "Nawaf",
  "ناصر": "Nasser",
  "نصار": "Nassar",
  "منصور": "Mansour",
  "ماجد": "Majed",
  "مهند": "Mohannad",
  "طارق": "Tariq",
  "زياد": "Ziyad",
  "زيد": "Zaid",
  "زايد": "Zayed",
  "ريان": "Rayan",
  "راكان": "Rakan",
  "راشد": "Rashid",
  "رائد": "Raed",
  "رضا": "Reda",
  "رمزي": "Ramzi",
  "رياض": "Riyadh",
  "ياسر": "Yasser",
  "يوسف": "Youssef",
  "يونس": "Younis",
  "يحيى": "Yahya",
  "يعقوب": "Yaqoub",
  "إبراهيم": "Ibrahim",
  "ابراهيم": "Ibrahim",
  "إسماعيل": "Ismail",
  "اسماعيل": "Ismail",
  "إسحاق": "Isaac",
  "اسحاق": "Isaac",
  "إدريس": "Idris",
  "ادريس": "Idris",
  "إلياس": "Elias",
  "الياس": "Elias",
  "أيمن": "Ayman",
  "ايمن": "Ayman",
  "أنور": "Anwar",
  "انور": "Anwar",
  "أنس": "Anas",
  "انس": "Anas",
  "أسامة": "Osama",
  "اسامة": "Osama",
  "أصيل": "Aseel",
  "اصيل": "Aseel",
  "أكرم": "Akram",
  "اكرم": "Akram",
  "أمجد": "Amjad",
  "امجد": "Amjad",
  "أمين": "Amin",
  "امين": "Amin",
  "إياد": "Iyad",
  "اياد": "Iyad",
  "إيهاب": "Ehab",
  "ايهاب": "Ehab",
  "آسر": "Aser",
  "حسن": "Hassan",
  "حسين": "Hussein",
  "حسني": "Hosny",
  "حسنين": "Hassanein",
  "حسام": "Hossam",
  "حمد": "Hamad",
  "حماد": "Hammad",
  "حميد": "Humaid",
  "حامد": "Hamed",
  "حاتم": "Hatem",
  "حبيب": "Habib",
  "حيدر": "Haidar",
  "حمزة": "Hamza",
  "حازم": "Hazem",
  "حافظ": "Hafez",
  "حرب": "Harb",
  "حمدي": "Hamdy",
  "حكيم": "Hakeem",
  "حجاج": "Hajjaj",
  "جمال": "Gamal",
  "جابر": "Jaber",
  "جعفر": "Jaafar",
  "جميل": "Jameel",
  "جهاد": "Jihad",
  "جاسم": "Jassim",
  "جاسر": "Jaser",
  "جلال": "Jalal",
  "جمعة": "Gomaa",
  "جود": "Joud",
  "جواد": "Jawad",
  "طلال": "Talal",
  "طه": "Taha",
  "تامر": "Tamer",
  "توفيق": "Tawfiq",
  "تيسير": "Tayseer",
  "تميم": "Tamim",
  "تحسين": "Tahseen",
  "بدر": "Badr",
  "بشير": "Basheer",
  "براء": "Baraa",
  "باسم": "Bassem",
  "باسل": "Bassel",
  "بلال": "Belal",
  "بكر": "Bakr",
  "بركات": "Barakat",
  "بهاء": "Bahaa",
  "باهر": "Baher",
  "بسام": "Bassam",
  "بدوي": "Badawi",
  "بدري": "Badri",
  "مروان": "Marwan",
  "معاذ": "Moath",
  "منير": "Muneer",
  "مساعد": "Musaad",
  "مسعود": "Masoud",
  "متعب": "Mutaib",
  "مبارك": "Mubarak",
  "مقبل": "Muqbil",
  "ممدوح": "Mamdouh",
  "مازن": "Mazen",
  "مالك": "Malik",
  "مراد": "Murad",
  "مجدي": "Majdi",
  "مؤيد": "Moayed",
  "موسى": "Mousa",
  "محسن": "Mohsen",
  "مدحت": "Medhat",
  "متولي": "Metwally",
  "مهدي": "Mahdi",
  "مختار": "Mokhtar",
  "معتز": "Moataz",
  "مؤمن": "Momen",
  "ماهر": "Maher",
  "محفوظ": "Mahfouz",
  "مظهر": "Mazhar",
  "محيي": "Mohy",
  "محي": "Mohy",
  "مداح": "Maddah",
  "نزار": "Nizar",
  "نبيل": "Nabil",
  "نديم": "Nadeem",
  "نجيب": "Najeeb",
  "نادر": "Nader",
  "نجم": "Najm",
  "نصر": "Nasr",
  "نعيم": "Naeem",
  "نشأت": "Nashaat",
  "نمر": "Nimr",
  "ناظم": "Nazem",
  "هاني": "Hany",
  "هشام": "Hisham",
  "هيثم": "Haitham",
  "هاشم": "Hashem",
  "همام": "Homam",
  "هلال": "Hilal",
  "هادي": "Hadi",
  "وائل": "Wael",
  "وسيم": "Waseem",
  "وضاح": "Waddah",
  "وهيب": "Waheeb",
  "وديع": "Wadee",
  "وجدي": "Wagdy",
  "وسام": "Wesam",
  "وهبي": "Wahbi",
  "وحيد": "Waheed",
  "شادي": "Shadi",
  "شريف": "Sharif",
  "شاهد": "Shahid",
  "شكري": "Shukri",
  "شوقي": "Shawqi",
  "شاهر": "Shaher",
  "شحاتة": "Shehata",
  "شعبان": "Shaaban",
  "شاهين": "Shaheen",
  "شهاب": "Shehab",
  "شوكت": "Shawkat",
  "صالح": "Saleh",
  "صلاح": "Salah",
  "صباح": "Sabah",
  "صخر": "Sakhr",
  "صابر": "Saber",
  "صادق": "Sadiq",
  "صفوان": "Safwan",
  "صبري": "Sabri",
  "صبحي": "Sobhy",
  "صقر": "Saqr",
  "صفوت": "Safwat",
  "ضياء": "Diya",
  "ضرار": "Dirar",
  "رمضان": "Ramadan",
  "رجب": "Ragab",
  "طلعت": "Talaat",
  "رفعت": "Refaat",
  "ثروت": "Tharwat",
  "بهجت": "Bahgat",
  "عزت": "Ezzat",
  "رأفت": "Raafat",
  "عصمت": "Esmat",
  "خميس": "Khamees",
  "ربيع": "Rabie",
  "قاسم": "Qasim",
  "قنديل": "Qandeel",
  "عاشور": "Ashour",
  "كاظم": "Kazem",
  "زاهر": "Zaher",
  "خليل": "Khalil",
  "دياب": "Diab",
  "عبده": "Abdo",
  "كلثوم": "Kulthum",
  "حداد": "Haddad",
  "نجار": "Najjar",
  "كرم": "Karam",
  "ياسين": "Yassin",
  "زويل": "Zewail",

  // Female Given Names
  "فاطمة": "Fatima",
  "مريم": "Maryam",
  "عائشة": "Aisha",
  "سارة": "Sarah",
  "نورة": "Noura",
  "نور": "Nour",
  "هند": "Hind",
  "هدى": "Huda",
  "ريم": "Reem",
  "ريناد": "Renad",
  "رغد": "Raghad",
  "روان": "Rawan",
  "رزان": "Razan",
  "ريما": "Rima",
  "رهف": "Rahaf",
  "رانيا": "Rania",
  "رحمة": "Rahma",
  "العنود": "Alanoud",
  "الجوهرة": "Aljawhara",
  "الريم": "Alreem",
  "الهنوف": "Alhanouf",
  "البندري": "Albandari",
  "أمل": "Amal",
  "امل": "Amal",
  "أماني": "Amani",
  "اماني": "Amani",
  "أميرة": "Amira",
  "اميرة": "Amira",
  "أسماء": "Asma",
  "اسماء": "Asma",
  "أروى": "Arwa",
  "اروى": "Arwa",
  "أفنان": "Afnan",
  "افنان": "Afnan",
  "أسرار": "Asrar",
  "إيمان": "Iman",
  "ايمان": "Iman",
  "إسراء": "Israa",
  "اسراء": "Israa",
  "إلهام": "Ilham",
  "الهام": "Ilham",
  "ابتسام": "Ibtisam",
  "منى": "Mona",
  "منال": "Manal",
  "مها": "Maha",
  "مي": "May",
  "ميساء": "Maysa",
  "مرام": "Maram",
  "مشاعل": "Mashaer",
  "موضي": "Moudi",
  "منيرة": "Munira",
  "شهد": "Shahad",
  "شيماء": "Shaimaa",
  "شروق": "Shorouq",
  "شذى": "Shatha",
  "شمس": "Shams",
  "شريفة": "Sharifa",
  "دلال": "Dalal",
  "دانة": "Dana",
  "ديما": "Dima",
  "دعاء": "Doaa",
  "دنيا": "Donia",
  "خلود": "Kholoud",
  "خديجة": "Khadija",
  "هيا": "Haya",
  "هالة": "Hala",
  "هيفاء": "Haifa",
  "هناء": "Hanaa",
  "وفاء": "Wafaa",
  "ولاء": "Walaa",
  "وئام": "Weam",
  "زينب": "Zainab",
  "زهراء": "Zahraa",
  "الزهراء": "Alzahraa",
  "زهرة": "Zahra",
  "ياسمين": "Yasmeen",
  "يسرى": "Yosra",
  "لجين": "Lojain",
  "لمى": "Lama",
  "لينا": "Lina",
  "ليلى": "Laila",
  "لطيفة": "Latifa",
  "نجوى": "Najwa",
  "سلوى": "Salwa",
  "فدوى": "Fadwa",
  "مروا": "Marwa",
  "مروة": "Marwa",
  "رضوى": "Radwa",
  "نهى": "Noha",
  "علا": "Ola",
  "حلا": "Hala",
  "رنا": "Rana",
  "سناء": "Sanaa",
  "جنى": "Jana",
  "صبا": "Saba",
  "رشا": "Rasha",
  "ضحى": "Doha",
  "سهى": "Soha",
  "سماح": "Samah",
  "فيروز": "Fairouz",
  "نهاد": "Nihad",

  // Major Tribes & Surnames (Saudi, Gulf, Egyptian, Arab)
  "الغامدي": "Alghamdi",
  "العتيبي": "Alotaibi",
  "الشهري": "Alshehri",
  "القحطاني": "Alqahtani",
  "الشمري": "Alshammari",
  "الدوسري": "Aldossary",
  "المطيري": "Almutairi",
  "الحربي": "Alharbi",
  "الزهراني": "Alzahrani",
  "السبيعي": "Alsubaie",
  "الرويلي": "Alrwaili",
  "العنزي": "Alenezi",
  "الخالدي": "Alkhaldi",
  "النجار": "Alnajjar",
  "الحداد": "Alhaddad",
  "العمري": "Alomari",
  "القرني": "Alqarni",
  "المالكي": "Almalki",
  "العصيمي": "Alosaimi",
  "الحازمي": "Alhazmi",
  "البارقي": "Albariqi",
  "العسيري": "Alasiri",
  "الصالحي": "Alsalihi",
  "الفيفي": "Alfaifi",
  "الجهني": "Aljuhani",
  "البقمي": "Albuqami",
  "السلمي": "Alsulami",
  "الثبيتي": "Althubaiti",
  "الجعفري": "Aljaafari",
  "الهذلي": "Alhuthali",
  "الراشدي": "Alrashidi",
  "البلوي": "Albalawi",
  "التميمي": "Altamimi",
  "الحارثي": "Alharthi",
  "اليامي": "Alyami",
  "الخثعمي": "Alkhathami",
  "السعدي": "Alsaadi",
  "الشريف": "Alsharif",
  "المهيدب": "Almuhaidib",
  "الراجحي": "Alrajhi",
  "العلياني": "Alolyani",
  "الداود": "Aldawood",
  "العجلان": "Alajlan",
  "المنصور": "Almansour",
  "السلطان": "Alsultan",
  "الموسى": "Almousa",
  "العيسى": "Aleissa",
  "التركي": "Alturki",
  "الشايع": "Alshaya",
  "الفريح": "Alfuraih",
  "البسام": "Albassam",
  "السنيدي": "Alsonaidy",
  "المقبل": "Almuqbil",
  "العسكر": "Alaskar",
  "الهديب": "Alhudaib",
  "العامودي": "Alamoudi",
  "باوزير": "Bawazir",
  "باعشن": "Baaoshan",
  "باطويل": "Batweel",
  "بامخرمة": "Bamakhrama",
  "بافقيه": "Bafaqeeh",
  "الشناوي": "Alshenawy",
  "الشربيني": "Alsherbini",
  "الشرقاوي": "Alsharqawi",
  "الباز": "Albaz",
  "الديب": "Aldeeb",
  "الجمل": "Elgamal",
  "الهواري": "Alhawari",
  "الصاوي": "Alsawi",
  "الغزالي": "Alghazali",
  "العقاد": "Alaqqad",
  "المصري": "Elmasry",
  "الشامي": "Elshamy",
  "المهندس": "Almohandis",
  "الساهر": "Alsaher",
  "الأطرش": "Alatrash",
  "الصافي": "Alsafi",
  "الصديق": "Alsiddiq",
  "القسام": "Alqassam",
  "القذافي": "Alqaddafi",
};

// Phonetic Character Map
const CHAR_MAP: Record<string, string> = {
  "ا": "a", "أ": "a", "إ": "e", "آ": "aa", "ء": "", "ئ": "e", "ؤ": "o",
  "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh", "د": "d",
  "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d",
  "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q", "ك": "k",
  "ل": "l", "م": "m", "ن": "n", "ه": "h", "و": "w", "ي": "y", "ى": "a",
  "ة": "a"
};

// Remove Arabic diacritics (tashkeel)
function removeTashkeel(text: string): string {
  return text.replace(/[\u064B-\u065F\u0670]/g, "");
}

// Capitalize first letter of word
function capitalize(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/**
 * Phonetically transliterates a single Arabic token using morphological patterns.
 */
function phoneticTransliterate(token: string): string {
  if (!token) return "";
  
  let clean = removeTashkeel(token);
  let prefix = "";

  // Check if token starts with "ال" (Al-)
  if (clean.startsWith("ال") && clean.length > 2) {
    prefix = "Al";
    clean = clean.slice(2);
  }

  // Check if remainder is in dictionary
  if (NAME_DICTIONARY[clean]) {
    return prefix ? `${prefix}${NAME_DICTIONARY[clean].toLowerCase()}` : NAME_DICTIONARY[clean];
  }

  // Handle words ending in "وى" e.g. نجوى -> Najwa, سلوى -> Salwa
  if (clean.endsWith("وى")) {
    const root = clean.slice(0, -2);
    let rootEn = "";
    for (const ch of root) rootEn += CHAR_MAP[ch] || ch;
    return capitalize(`${prefix}${rootEn}wa`);
  }

  // Morphological pattern recognizer:
  // 1. Fa'lan (فعلان): e.g. زهران, قحطان
  if (clean.length === 5 && clean.endsWith("ان")) {
    const c1 = CHAR_MAP[clean[0]] || "";
    const c2 = CHAR_MAP[clean[1]] || "";
    const c3 = CHAR_MAP[clean[2]] || "";
    return capitalize(`${prefix}${c1}a${c2}a${c3}an`);
  }

  // 2. Fa'eel (فعيل): e.g. سميع, حكيم, سليم, خليل
  if (clean.length === 4 && clean[2] === "ي") {
    const c1 = CHAR_MAP[clean[0]] || "";
    const c2 = CHAR_MAP[clean[1]] || "";
    const c3 = CHAR_MAP[clean[3]] || "";
    return capitalize(`${prefix}${c1}a${c2}ee${c3}`);
  }

  // 3. Fa'ool (فعول): e.g. شكور, غفور, صبور
  if (clean.length === 4 && clean[2] === "و") {
    const c1 = CHAR_MAP[clean[0]] || "";
    const c2 = CHAR_MAP[clean[1]] || "";
    const c3 = CHAR_MAP[clean[3]] || "";
    return capitalize(`${prefix}${c1}a${c2}oo${c3}`);
  }

  // 4. Faa'il (فاعل): e.g. طارق, خالد, ماجد
  if (clean.length === 4 && clean[1] === "ا") {
    const c1 = CHAR_MAP[clean[0]] || "";
    const c2 = CHAR_MAP[clean[2]] || "";
    const c3 = CHAR_MAP[clean[3]] || "";
    return capitalize(`${prefix}${c1}a${c2}e${c3}`);
  }

  // 5. Maf'ool (مفعول): e.g. مبروك, مشكور, مقبول
  if (clean.length === 5 && clean[0] === "م" && clean[3] === "و") {
    const c1 = CHAR_MAP[clean[1]] || "";
    const c2 = CHAR_MAP[clean[2]] || "";
    const c3 = CHAR_MAP[clean[4]] || "";
    return capitalize(`${prefix}ma${c1}${c2}oo${c3}`);
  }

  let result = "";
  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === "و" && i > 0 && i === clean.length - 1) {
      result += "ou";
    } else if (char === "ي" && i > 0 && i === clean.length - 1) {
      result += "i";
    } else if (char === "و" && nextChar === "و") {
      result += "oo";
      i++;
    } else if (char === "ي" && nextChar === "ي") {
      result += "ee";
      i++;
    } else if (CHAR_MAP[char] !== undefined) {
      result += CHAR_MAP[char];
    } else {
      result += char;
    }
  }

  const capitalized = capitalize(result);
  return prefix ? `${prefix}${capitalized.toLowerCase()}` : capitalized;
}

/**
 * Main Arabic Name to English Transliteration Function
 * 
 * @param arabicName - The full Arabic name e.g. "محمد عبدالله سالم الغامدي"
 * @returns Transliterated English full name e.g. "Mohammed Abdullah Salem Alghamdi"
 */
export function transliterateArabicName(arabicName: string): string {
  if (!arabicName || typeof arabicName !== "string") return "";

  let text = removeTashkeel(arabicName.trim());
  if (!text) return "";

  // Sort compound entries by length descending so longest matches take precedence
  const compoundEntries = Object.entries(COMPOUND_PREFIXES).sort((a, b) => b[0].length - a[0].length);

  for (const [arCompound, enCompound] of compoundEntries) {
    if (text.includes(arCompound)) {
      const safePlaceholder = `___${enCompound.replace(/\s+/g, "_")}___`;
      text = text.split(arCompound).join(safePlaceholder);
    }
  }

  // Split tokens by spaces
  const tokens = text.split(/\s+/).filter(Boolean);
  const resultWords: string[] = [];

  for (const token of tokens) {
    // Check if token is a placeholder from compound replacement
    if (token.startsWith("___") && token.endsWith("___")) {
      const restored = token.slice(3, -3).replace(/_/g, " ");
      resultWords.push(restored);
      continue;
    }

    // Check direct dictionary
    if (NAME_DICTIONARY[token]) {
      resultWords.push(NAME_DICTIONARY[token]);
      continue;
    }

    // Check if starts with "ال" and remainder is in dictionary
    if (token.startsWith("ال") && token.length > 2) {
      const remainder = token.slice(2);
      if (NAME_DICTIONARY[remainder]) {
        resultWords.push(`Al${NAME_DICTIONARY[remainder].toLowerCase()}`);
        continue;
      }
    }

    // Fallback to morphological phonetic engine
    const transliterated = phoneticTransliterate(token);
    if (transliterated) {
      resultWords.push(transliterated);
    }
  }

  return resultWords.join(" ").trim();
}
