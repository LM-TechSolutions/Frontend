import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'am' | 'om';
export type ThemeMode = 'light' | 'dark';

const translations = {
  en: {
    nav: {
      dashboard: 'Dashboard',
      analytics: 'Analytics',
      operators: 'Operators',
      callLogs: 'Call Logs',
      rides: 'Rides',
      drivers: 'Drivers',
      coupons: 'Coupons',
      settings: 'Settings',
    },
    auth: {
      welcome: 'Welcome to TEKUMMA',
      description: 'Sign in to access the dispatch system',
      login: 'Login',
      loggingIn: 'Logging in...',
      operator: 'Operator',
      admin: 'Administrator',
      email: 'Email',
      password: 'Password',
      selectRole: 'Login as',
      fillAll: 'Please fill in all fields',
      loginSuccessful: 'Login successful as',
    },
    common: {
      logout: 'Logout',
      notifications: 'Notifications',
      profile: 'Profile',
      account: 'My Account',
      viewDetails: 'View Details',
      saveChanges: 'Save Changes',
      cancel: 'Cancel',
      addNew: 'Add New',
      search: 'Search',
      language: 'Language',
      theme: 'Theme',
      darkMode: 'Dark Mode',
      lightMode: 'Light Mode',
    },
    drivers: {
      title: 'Driver Management',
      subtitle: 'Manage your driver fleet',
      searchPlaceholder: 'Search by Name, Phone, Vehicle, License Plate...',
      addButton: 'Add New Driver',
      addTitle: 'Add New Driver',
      save: 'Add Driver',
      edit: 'Edit Driver',
      update: 'Update Driver',
      viewProfile: 'View Profile',
      editSuccess: 'Driver updated successfully!',
      createSuccess: 'Driver added successfully!',
      fillFields: 'Please fill in all required fields',
      driverName: 'Driver Name',
      phone: 'Phone Number',
      vehicle: 'Vehicle Model',
      licensePlate: 'License Plate',
      couponBalance: 'Initial Coupon Balance',
      totalDrivers: 'Total Drivers',
      available: 'Available',
      busy: 'Busy',
      noDrivers: 'No drivers found',
    },
    operators: {
      title: 'Operators Management',
      subtitle: 'Manage call center operators and track performance',
      searchPlaceholder: 'Search by name, email, or phone...',
      addButton: 'Add Operator',
      viewDetails: 'View Details',
      noOperators: 'No operators found matching your criteria',
    },
    rides: {
      title: 'Ride History',
      subtitle: 'View and manage all ride records',
      searchPlaceholder: 'Search by Ride ID, Customer, Location...',
      filterStatus: 'Filter by Status',
      addRide: 'New Ride',
      createRide: 'Create New Ride',
      rideCreated: 'Ride created successfully!',
      customerName: 'Customer Name',
      customerPhone: 'Customer Phone',
      pickupLocation: 'Pickup Location',
      dropoffLocation: 'Dropoff Location',
      rideDetails: 'Ride Details',
      rideNotFound: 'Ride not found',
      backToDashboard: 'Back to Dashboard',
      rideProgress: 'Ride Progress',
      driverInformation: 'Driver Information',
      rideID: 'Ride ID',
      createdAt: 'Created At',
      lastUpdated: 'Last Updated',
      estimatedFare: 'Estimated Fare',
      cancelRide: 'Cancel Ride',
      noDriverAssigned: 'No driver assigned yet',
      liveTrackingPlaceholder: 'Live map tracking will be displayed here when Google Maps API is configured',
      carDetails: 'Vehicle Details',
      vehicleInfo: 'Vehicle Information',
      licensePlate: 'License Plate',
    },
    coupons: {
      title: 'Coupon Management',
      subtitle: 'Manage driver coupon balances and transactions',
      selectDriver: 'Select Driver:',
      refill: 'Refill Coupons',
      confirmRefill: 'Confirm Refill',
      currentBalance: 'Current Coupon Balance',
      lowBalance: 'Low Balance Warning',
      moderateBalance: 'Moderate Balance',
      goodBalance: 'Good Balance',
      transactionHistory: 'Transaction History',
      noTransactions: 'No transactions found for this driver',
      enterAmount: 'Enter number of coupons',
      validAmount: 'Please enter a valid amount',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Manage your account and application preferences',
      profileSettings: 'Profile Settings',
      notificationSettings: 'Notification Settings',
      systemSettings: 'System Settings',
      security: 'Security',
      autoAssign: 'Auto-assign Closest Driver',
      soundAlerts: 'Sound Alerts',
      mapKey: 'Google Maps API Key',
      saveSystem: 'Save System Settings',
      changePassword: 'Change Password',
      logout: 'Logout',
    },
  },
  am: {
    nav: {
      dashboard: 'ዳሽቦርድ',
      analytics: 'ትንታኔ',
      operators: 'ኦፕሬተሮች',
      callLogs: 'የጥሪ መዝገቦች',
      rides: 'ጉዞዎች',
      drivers: 'አነሶች',
      coupons: 'ኩፖኖች',
      settings: 'ቅንብሮች',
    },
    auth: {
      welcome: 'ወደ TEKUMMA እንኳን በደህና መጡ',
      description: 'ለዲስፓች ስርዓት መዳረሻ ይግቡ',
      login: 'ግባ',
      loggingIn: 'በመግባት ላይ...',
      operator: 'ኦፕሬተር',
      admin: 'አስተዳደር',
      email: 'ኢሜል',
      password: 'የሚከተለው ቃል',
      selectRole: 'እንደ ማን ትግቡ',
      fillAll: 'እባክዎ ሁሉንም ይሙሉ',
      loginSuccessful: 'በተሳካነት ወደ ደረጃው ገባ',
    },
    common: {
      logout: 'ውጣ',
      notifications: 'ማስጠንቀቂያዎች',
      profile: 'መገለጫ',
      account: 'የእኔ መለያ',
      viewDetails: 'ዝርዝር ተመልከት',
      saveChanges: 'ለውጦችን አስቀመጥ',
      cancel: 'አቁም',
      addNew: 'አዲስ ያክሉ',
      search: 'ፈልግ',
      language: 'ቋንቋ',
      theme: 'ቅጥ',
      darkMode: 'ጨለማ ሁኔታ',
      lightMode: 'ብርሃን ሁኔታ',
    },
    drivers: {
      title: 'የአነሶች አስተዳደር',
      subtitle: 'የአነሶች ጉዞ አስተዳደር ያስተካክሉ',
      searchPlaceholder: 'በስም, ስልክ, ተሽከርካሪ, መዝገበ መኪና ፈልግ...',
      addButton: 'አዲስ አነስ ያክሉ',
      addTitle: 'አዲስ አነስ ያክሉ',
      save: 'አነሱን ያክሉ',
      edit: 'አንሱን አስተካክሉ',
      update: 'አስተካክል',
      viewProfile: 'መገለጫ ይመልከቱ',
      editSuccess: 'አነሱ በተሳካ ሁኔታ ተሻሽሏል!',
      createSuccess: 'አነሱ ተጨምሯል!',
      fillFields: 'እባክዎ ያስፈልጉትን ሁሉ ይሙሉ',
      driverName: 'የአነሱ ስም',
      phone: 'የስልክ ቁጥር',
      vehicle: 'የተሽከርካሪ ሞዴል',
      licensePlate: 'የፈቃድ ታስሪ',
      couponBalance: 'የኩፖን ዕረፍት',
      totalDrivers: 'አጠቃላይ አነሶች',
      available: 'የሚገኝ',
      busy: 'ሙሉ ስራ',
      noDrivers: 'አነሶች አልተገኙም',
    },
    operators: {
      title: 'የኦፕሬተሮች አስተዳደር',
      subtitle: 'የመስመር ላይ ኦፕሬተሮችን እና አፈፃፀም ይቆጣጠሩ',
      searchPlaceholder: 'በስም, ኢሜል, ወይም ስልክ ፈልግ...',
      addButton: 'ኦፕሬተር ያክሉ',
      viewDetails: 'ዝርዝር ይመልከቱ',
      noOperators: 'ኦፕሬተሮች አልተገኙም',
    },
    rides: {
      title: 'የጉዞ ታሪክ',
      subtitle: 'ሁሉንም የጉዞ መዝገቦች ይመልከቱና ያስተዳድሩ',
      searchPlaceholder: 'በጉዞ መታወቂያ, ደንበኛ, ወይም ቦታ ፈልግ...',
      filterStatus: 'በሁኔታ ይፈልጉ',
      addRide: 'ጉዞ አዲስ አቀርብ',
      createRide: 'አዲስ ጉዞ ያብሩ',
      rideCreated: 'ጉዞ በተሳካነት ተፈጥሯል!',
      customerName: 'የደንበኛ ስም',
      customerPhone: 'የደንበኛ ስልክ',
      pickupLocation: 'የመውሰድ ቦታ',
      dropoffLocation: 'የማሰናከል ቦታ',
      rideDetails: 'የጉዞ ዝርዝር',
      rideNotFound: 'ጉዞ አልተገኘም',
      backToDashboard: 'ወደ ዳሽቦርድ ተመለስ',
      rideProgress: 'የጉዞ ሂደት',
      driverInformation: 'የአንሱ መረጃ',
      rideID: 'የጉዞ መታወቂያ',
      createdAt: 'የተፈጠረበት',
      lastUpdated: 'የታዘዘው',
      estimatedFare: 'ተጠናቀቀ ወጪ',
      cancelRide: 'ጉዞን ሰርዝ',
      noDriverAssigned: 'አንስ አልተመደበም',
      liveTrackingPlaceholder: 'የቀጥታ ካርታ ከGoogle Maps ጋር ሲገናኝ እዚህ ይታያል',
      carDetails: 'የመኪና ዝርዝር',
      vehicleInfo: 'የመኪና መረጃ',
    },
    coupons: {
      title: 'የኩፖን አስተዳደር',
      subtitle: 'የአነሶች የኩፖን ሂሳብ እና ግብይቶችን ይቆጣጠሩ',
      selectDriver: 'አነስ ይምረጡ፡',
      refill: 'ኩፖን ያስገቡ',
      confirmRefill: 'አረጋግጥ',
      currentBalance: 'የአሁኑ የኩፖን ሂሳብ',
      lowBalance: 'የታነ ሂሳብ ማስጠንቀቂያ',
      moderateBalance: 'መካከለኛ ሂሳብ',
      goodBalance: 'ጥሩ ሂሳብ',
      transactionHistory: 'የግብይት ታሪክ',
      noTransactions: 'ለይም አንኳን ግብይቶች አልተገኙም',
      enterAmount: 'የኩፖን ብዛት ያስገቡ',
      validAmount: 'እባክዎ እውነተኛ መጠን ያስገቡ',
    },
    settings: {
      title: 'ቅንብሮች',
      subtitle: 'የመለያዎን እና የመተግበሪያ ቅንብሮችን ያስተካክሉ',
      profileSettings: 'የመገለጫ ቅንብሮች',
      notificationSettings: 'የማስጠንቀቂያ ቅንብሮች',
      systemSettings: 'የስርዓት ቅንብሮች',
      security: 'የደህንነት',
      autoAssign: 'እንደ ቅርብ ያሉትን አነሶች በአንድ ጊዜ ይመደቁ',
      soundAlerts: 'የድምጽ ማስጠንቀቂያዎች',
      mapKey: 'የGoogle Maps API ቁልፍ',
      saveSystem: 'የስርዓት ቅንብሮችን ማስቀመጥ',
      changePassword: 'የይለፍ ቃል ይቀይሩ',
      logout: 'ውጣ',
    },
  },
  om: {
    nav: {
      dashboard: 'Boordii',
      analytics: 'Xiinxala',
      operators: 'Opeeretaroota',
      callLogs: 'Galmee Bilbilaa',
      rides: 'Imala',
      drivers: 'Draayivaroota',
      coupons: 'Kupoontota',
      settings: 'Qindaaʼinoota',
    },
    auth: {
      welcome: 'TEKUMMA keessa baga nagaan dhuftan',
      description: 'Sirna geejjibaa fayyadamuu dhaaf seenaa',
      login: 'Seeni',
      loggingIn: 'Seenaa jira...',
      operator: 'Opeeretara',
      admin: 'Gargaaraa',
      email: 'Iimeelii',
      password: 'Jecha darbee',
      selectRole: 'Akka eenyutti seentu',
      fillAll: 'Mata dureewwan hunda guutuu',
      loginSuccessful: 'Milkaaʼinaan seente',
    },
    common: {
      logout: 'Baʼi',
      notifications: 'Beeksisoota',
      profile: 'Profaayilii',
      account: 'Akkaawuntii Koo',
      viewDetails: 'Faayila Ilaali',
      saveChanges: 'Itti fufi jijjiirraa',
      cancel: 'Haquu',
      addNew: 'Haaraa dabaluu',
      search: 'Barbaadi',
      language: 'Afaan',
      theme: 'Foonii',
      darkMode: 'Haala Dukkanaa',
      lightMode: 'Haala Ifaa',
    },
    drivers: {
      title: 'Bulchiinsa Draayivaroota',
      subtitle: 'Fleetii draayivaroota keetiin gulaali',
      searchPlaceholder: 'Maqaa, bilbila, konkolaataa, lakk. poolisii barbaadi...',
      addButton: 'Draayivarri Haaraa',
      addTitle: 'Draayivarri Haaraa Itti Dabaluu',
      save: 'Draayivarri Itti Dabaluu',
      edit: 'Draayivarri Gulaali',
      update: 'Gulaali',
      viewProfile: 'Profaayilii Ilaali',
      editSuccess: 'Draayivarri milkaaʼinaan haarawaʼee jira!',
      createSuccess: 'Draayivarri milkaaʼinaan dabalame!',
      fillFields: 'Maayyiiwwan hunda guuti',
      driverName: 'Maqaa Draayivaraa',
      phone: 'Lakkoofsa Bilbilaa',
      vehicle: 'Moodeela Konkolaataa',
      licensePlate: 'Lakk. Hayyamaa',
      couponBalance: 'Baalaansii Kupoontii',
      totalDrivers: 'Draayivaroota Guutuu',
      available: 'Argamuu',
      busy: 'Hojii Jiru',
      noDrivers: 'Draayivarri hin argamne',
    },
    operators: {
      title: 'Bulchiinsa Opeeretaroota',
      subtitle: 'Opeeretaroota fi hojiirra oolmaa isaanii toʼadhu',
      searchPlaceholder: 'Maqaa, iimeelii, ykn bilbila barbaadi...',
      addButton: 'Opeeretara Dabaluu',
      viewDetails: 'Faayila Ilaali',
      noOperators: 'Opeeretaroonni hin argamne',
    },
    rides: {
      title: 'Seenaa Imalaa',
      subtitle: 'Galmeewwan imalaa hunda ilaali fi toʼadhu',
      searchPlaceholder: 'ID imalaa, maqa hojii, bakka barbaadi...',
      filterStatus: 'Haala filadhu',
      addRide: 'Imala Haaraa',
      createRide: 'Imala Haaraa Uumi',
      rideCreated: 'Imalli milkaaʼinaan uume!',
      customerName: 'Maqaa Maamilaa',
      customerPhone: 'Bilbila Maamilaa',
      pickupLocation: 'Bakka Kaʼumsaa',
      dropoffLocation: 'Bakka Gadhiisa',
      rideDetails: 'Faayila Imalaa',
      rideNotFound: 'Imalli hin argamne',
      backToDashboard: 'Deebiʼi Gara Boordii',
      rideProgress: 'Guddina Imalaa',
      driverInformation: 'Odeeffannoo Draayivaraa',
      rideID: 'ID Imalaa',
      createdAt: 'Kan Uumame',
      lastUpdated: 'Kan Haaraa Taʼe',
      estimatedFare: 'Kaffaltii Qindaaʼe',
      cancelRide: 'Imala Haqi',
      noDriverAssigned: 'Draayivarri hin qoodamne',
      liveTrackingPlaceholder: 'Kaartee jireenyaa Google Maps waliin yoo qindaaʼe asitti mulʼata',
      carDetails: 'Faayila Konkolaataa',
      vehicleInfo: 'Odeeffannoo Konkolaataa',
    },
    coupons: {
      title: 'Bulchiinsa Kupoontaa',
      subtitle: 'Balansi kouponii draayivaroota fi galmee isaaniitiin gulaali',
      selectDriver: 'Draayivara Filadhu:',
      refill: 'Kupoontii deebisi',
      confirmRefill: 'Mirkanneessi',
      currentBalance: 'Balansi Kouponii Ammaa',
      lowBalance: 'Beeksisa Balansi Gad aanaa',
      moderateBalance: 'Balansi Giddu gala',
      goodBalance: 'Balansi Gaarii',
      transactionHistory: 'Seenaa Jijjiirraa',
      noTransactions: 'Galmeewwan hin argamne',
      enterAmount: 'Baayʼina kouponii galchi',
      validAmount: 'Baayʼina sirrii galchi',
    },
    settings: {
      title: 'Qindaaʼinoota',
      subtitle: 'Akkaawuntii fi filannoo appilikeeshinii kee tooʼadhu',
      profileSettings: 'Qindaaʼinoota Profaayilii',
      notificationSettings: 'Qindaaʼinoota Beeksisa',
      systemSettings: 'Qindaaʼinoota Sirna',
      security: 'Nageenya',
      autoAssign: 'Draayivarri dhihoo akka filamu',
      soundAlerts: 'Beeksisa Sagalee',
      mapKey: 'Furdaa API Google Maps',
      saveSystem: 'Qindaaʼinoota Sirnaa Olkaa’i',
      changePassword: 'Jecha darbii jijjiiri',
      logout: 'Baʼi',
    },
  },
};

type TranslationKey = keyof typeof translations['en'];

interface AppContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  t: (path: string, fallback?: string) => string;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const getString = (lang: Language, path: string, fallback?: string) => {
  const keys = path.split('.');
  let current: any = translations[lang];

  for (const key of keys) {
    if (current?.[key] == null) {
      return fallback ?? path;
    }
    current = current[key];
  }

  return typeof current === 'string' ? current : fallback ?? path;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language;
    const savedTheme = localStorage.getItem('theme') as ThemeMode;

    if (savedLanguage && ['en', 'am', 'om'].includes(savedLanguage)) {
      setLanguage(savedLanguage);
    }

    if (savedTheme === 'dark' || savedTheme === 'light') {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      theme,
      setTheme,
      t: (path: string, fallback?: string) => getString(language, path, fallback),
    }),
    [language, theme]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
