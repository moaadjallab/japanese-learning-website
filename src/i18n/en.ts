/**
 * English UI dictionary — source of truth for the dictionary shape (see ./types.ts).
 * Copy marked "SPEC" is taken verbatim from SPEC.md; keep it in sync with ar.ts.
 * Course, plan, FAQ and testimonial content lives in src/content/* (not here).
 */
export const en = {
  meta: {
    defaultTitle: 'Learn Japanese Online',
    titleTemplate: '{title} | {brand}',
    defaultDescription:
      'Learn Japanese online from complete beginner to advanced (JLPT N5–N1) with structured courses, live classes and monthly subscriptions. Taught for Arabic- and English-speaking students.',
  },
  common: {
    skipToContent: 'Skip to main content',
    startLearning: 'Start Learning', // SPEC
    subscribeNow: 'Subscribe Now', // SPEC
    viewPlans: 'View Plans', // SPEC
    learnMore: 'Learn More', // SPEC
    viewCourse: 'View Course', // SPEC
    viewAllCourses: 'View all courses',
    viewAllFaqs: 'View All FAQs', // SPEC
    comparePlans: 'Compare Plans', // SPEC
    subscribe: 'Subscribe',
    contactUs: 'Contact us',
    perMonth: '/ month',
    monthly: 'Monthly',
    billingFrequency: 'Billing frequency',
    mostPopular: 'Most Popular', // SPEC
    priceTbd: 'Price to be announced',
    menu: 'Menu',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    loading: 'Please wait…',
    opensNewTab: '(opens in a new tab)',
    included: 'Included',
    notIncluded: 'Not included',
    breadcrumb: 'Breadcrumb',
    placeholder: 'Placeholder',
  },
  nav: {
    label: 'Main navigation',
    home: 'Home',
    courses: 'Courses',
    pricing: 'Pricing',
    about: 'About',
    faq: 'FAQ',
    contact: 'Contact',
    login: 'Login',
    account: 'My account',
  },
  language: {
    label: 'Language',
    switchTo: 'Switch language to {language}',
  },
  footer: {
    description:
      'An online Japanese school for Arabic- and English-speaking learners: structured courses, live classes and practical Japanese, from your first kana to JLPT N1.',
    navigation: 'Navigation',
    support: 'Support',
    languages: 'Languages',
    legal: 'Legal',
    email: 'Email',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    rights: '© {year} {brand}. All rights reserved.',
  },
  legalLinks: {
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    refund: 'Refund Policy',
    cookies: 'Cookie Policy',
  },
  levels: {
    beginner: 'Beginner',
    n5: 'N5',
    n4: 'N4',
    n3: 'N3',
    n2: 'N2',
    n1: 'N1',
    unknown: "I don't know",
  },
  categories: {
    jlpt: 'JLPT',
    conversation: 'Conversation',
    travel: 'Travel',
    work: 'Work',
    grammar: 'Grammar',
    kanji: 'Kanji',
    vocabulary: 'Vocabulary',
    'hiragana-katakana': 'Hiragana & Katakana',
  },
  home: {
    meta: {
      title: 'Learn Japanese Online — Courses & Live Classes',
      description:
        'Learn Japanese from beginner to advanced with structured online courses and live classes. JLPT N5–N1, conversation, travel and work Japanese. Monthly subscription.',
    },
    hero: {
      eyebrow: 'Online Japanese school',
      title: 'Learn Japanese Online', // SPEC (flag rendered separately)
      subtitle: 'Learn Japanese from beginner to advanced with structured online courses and live classes.', // SPEC
      highlights: ['Beginner to JLPT N1', 'Live online classes', 'Explained in Arabic & English'],
      visualLabel: 'Decorative illustration: a vermilion sun behind a torii-inspired gate with sakura petals',
      sampleWord: 'Today’s word',
      sampleMeaning: 'to learn',
    },
    features: {
      eyebrow: 'Why us',
      title: 'Why Learn Japanese With Us?', // SPEC
      subtitle: 'A serious, structured way to learn Japanese — online, at your pace, with a real teacher.',
      items: [
        { title: 'All Levels', description: 'Learn from complete beginner to advanced Japanese.' },
        {
          title: 'Live Online Classes',
          description: 'Learn directly with your teacher through live online sessions.',
        },
        { title: 'Structured Courses', description: 'Follow a clear and organized learning path.' },
        {
          title: 'Exercises & Practice',
          description: 'Practice vocabulary, grammar, listening and conversation.',
        },
        {
          title: 'Japanese Culture',
          description: 'Learn the language while discovering Japanese culture.',
        },
      ],
    },
    courses: {
      eyebrow: 'Courses',
      title: 'Explore Our Courses', // SPEC
      subtitle: 'From your first hiragana to JLPT N1 — choose a course by level or by goal.',
      byLevel: 'Browse by level',
      byCategory: 'Browse by category',
    },
    howItWorks: {
      eyebrow: 'How it works',
      title: 'Start Learning Japanese in 4 Simple Steps', // SPEC
      steps: [
        { title: 'Choose Your Plan', description: 'Choose the subscription that fits your goals.' },
        { title: 'Create Your Account', description: 'Create your account in just a few minutes.' },
        { title: 'Subscribe', description: 'Complete your secure payment.' },
        {
          title: 'Start Learning',
          description: 'Access your learning experience and start improving your Japanese.',
        },
      ],
    },
    pricing: {
      eyebrow: 'Plans',
      title: 'Choose Your Learning Plan', // SPEC
      subtitle: 'Simple monthly subscriptions. Pick the level of support you need.',
    },
    teacher: {
      eyebrow: 'About us',
      title: 'Learn Japanese With Us', // SPEC
      body: [
        '{brand} was created to make Japanese learning more accessible to Arabic-speaking and English-speaking students — with clear explanations in your language and a structured path from your very first lesson.',
        'Our lessons focus on Japanese you can actually use, supported by live classes and personal guidance as you progress.',
      ],
      points: [
        'Structured learning',
        'Practical Japanese',
        'Live classes',
        'Personalized support',
        'Japanese language and culture',
      ],
      imageAlt: 'Teacher photo placeholder',
      teacherName: 'Teacher name',
      teacherRole: 'Japanese teacher — introduction to be added',
    },
    testimonials: {
      eyebrow: 'Testimonials',
      title: 'What Our Students Say', // SPEC
      subtitle: 'Real reviews from our students will appear here.',
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Frequently Asked Questions',
      subtitle: 'Quick answers before you subscribe.',
    },
    finalCta: {
      title: 'Ready to Start Learning Japanese?', // SPEC
      subtitle: 'Start your Japanese learning journey today.', // SPEC
    },
  },
  coursesPage: {
    meta: {
      title: 'Japanese Courses — Beginner to JLPT N1',
      description:
        'Browse online Japanese courses: beginner, JLPT N5 to N1, conversation, travel, work, hiragana & katakana, kanji, grammar and vocabulary.',
    },
    eyebrow: 'Course catalog',
    title: 'Japanese Courses',
    subtitle:
      'Every course is included in a monthly subscription. Filter by level or category to find the right starting point.',
    searchLabel: 'Search courses',
    searchPlaceholder: 'Search by course name or topic…',
    levelLabel: 'Level',
    categoryLabel: 'Category',
    allLevels: 'All levels',
    allCategories: 'All categories',
    // Plural forms follow Intl.PluralRules categories (Arabic uses all six).
    resultCount: {
      zero: '0 courses',
      one: '1 course',
      two: '2 courses',
      few: '{count} courses',
      many: '{count} courses',
      other: '{count} courses',
    },
    emptyTitle: 'No courses match your search',
    emptyBody: 'Try another keyword, or clear the filters to see all courses.',
    clearFilters: 'Clear filters',
    filtersLabel: 'Filter courses',
    notSureTitle: 'Not sure where to start?',
    notSureBody: 'Tell us about your level and goals — we will help you choose the right course and plan.',
  },
  courseDetail: {
    level: 'Level',
    category: 'Category',
    overview: 'Course overview',
    whatYouLearn: 'What you’ll learn',
    example: 'Example from this course',
    includedIn: 'Included in these plans',
    includedInBody: 'This course is part of the following monthly subscriptions:',
    related: 'Related courses',
    backToCourses: 'All courses',
    ctaTitle: 'Start this course today',
    ctaBody: 'Subscribe to a plan and get access to this course and the rest of the catalog.',
    metaDescription: '{description} Online Japanese course — level {level}. Included in our monthly plans.',
  },
  pricingPage: {
    meta: {
      title: 'Pricing — Monthly Japanese Learning Plans',
      description:
        'Compare the Basic, Premium and Private monthly plans: recorded courses, PDF materials, live classes, conversation practice, teacher support and private lessons.',
    },
    eyebrow: 'Pricing',
    title: 'Simple monthly plans',
    subtitle: 'Choose the plan that fits your goals. Every plan is billed monthly.',
    billingNote: 'Billed monthly. Final prices will be announced soon.',
    compareTitle: 'Compare plans',
    compareSubtitle: 'Everything included in each subscription, side by side.',
    featureColumn: 'Feature',
    comparison: {
      recordedCourses: 'Recorded courses',
      pdfMaterials: 'PDF materials',
      exercises: 'Exercises',
      quizzes: 'Quizzes',
      liveClasses: 'Live classes',
      conversationPractice: 'Conversation practice',
      teacherSupport: 'Teacher support',
      privateLessons: 'Private lessons',
      personalizedLearning: 'Personalized learning',
    },
    questionsTitle: 'Questions about subscriptions?',
    questionsBody: 'Read the FAQ or contact us — we are happy to help you choose.',
  },
  aboutPage: {
    meta: {
      title: 'About Us — Our Story, Mission & Teaching Approach',
      description:
        'Our mission: make Japanese language learning accessible, structured and practical for Arabic-speaking and English-speaking students.',
    },
    eyebrow: 'About',
    title: 'About {brand}',
    subtitle: 'An independent online Japanese school, built for Arabic- and English-speaking learners.',
    story: {
      title: 'Our Story',
      paragraphs: [
        'Many Arabic- and English-speaking learners love Japanese but struggle to find courses that explain it clearly in their own language, follow a logical progression and offer real practice with a teacher.',
        '{brand} was created to close that gap: one place to learn Japanese step by step, from the writing systems to JLPT preparation, with live classes and personal support.',
      ],
    },
    mission: {
      title: 'Our Mission',
      statement:
        'Make Japanese language learning accessible, structured and practical for Arabic-speaking and English-speaking students.', // SPEC
    },
    approach: {
      title: 'Our Teaching Approach',
      intro: 'We combine structure with practice, so that what you study becomes Japanese you can use.',
      items: [
        {
          title: 'A clear path',
          description:
            'Courses follow the JLPT levels from Beginner to N1, so you always know what comes next.',
        },
        {
          title: 'Explained in your language',
          description:
            'Grammar and vocabulary are explained in Arabic or English, with Japanese used naturally throughout.',
        },
        {
          title: 'Practice, not only theory',
          description:
            'Exercises, quizzes and conversation practice help you remember and speak with confidence.',
        },
        {
          title: 'Live guidance',
          description:
            'Live classes and teacher support (Premium and Private plans) keep you motivated and on track.',
        },
      ],
    },
    why: {
      title: 'Why Learn Japanese With Us',
    },
    teacher: {
      title: 'Our teachers',
      body: 'Teacher profiles will be published here. The platform is designed to welcome more Japanese teachers over time.',
    },
  },
  faqPage: {
    meta: {
      title: 'FAQ — Courses, Subscriptions, Classes & Payments',
      description:
        'Answers to common questions about our online Japanese courses, monthly subscriptions, live classes and payments.',
    },
    eyebrow: 'Help',
    title: 'Frequently Asked Questions',
    subtitle: 'Everything you need to know before you start.',
    categories: {
      courses: 'Courses',
      subscriptions: 'Subscriptions',
      classes: 'Classes',
      payments: 'Payments',
    },
    jumpTo: 'Jump to a category',
    stillTitle: 'Still have a question?',
    stillBody: 'Send us a message and we will get back to you.',
  },
  contactPage: {
    meta: {
      title: 'Contact Us',
      description:
        'Questions about our Japanese courses or subscriptions? Contact us by form, email, WhatsApp or Instagram.',
    },
    eyebrow: 'Contact',
    title: 'Get in touch',
    subtitle: 'Questions about courses, levels or plans? Send us a message and we will reply by email.',
    form: {
      title: 'Send us a message',
      name: 'Name',
      email: 'Email',
      subject: 'Subject',
      message: 'Message',
      submit: 'Send Message', // SPEC
      sending: 'Sending…',
      success: 'Thank you! Your message has been sent. We will reply by email.',
      errorGeneric: 'Something went wrong. Please try again, or contact us by email.',
      errorRateLimit: 'Too many messages. Please wait a few minutes and try again.',
      errorCaptcha: 'Please complete the security check and try again.',
      errorUnavailable: 'The contact form is temporarily unavailable. Please contact us by email.',
      privacyNote: 'We only use your details to reply to your message. See our {privacy}.',
      captchaLabel: 'Security check',
    },
    channels: {
      title: 'Other ways to reach us',
      whatsapp: 'WhatsApp',
      whatsappBody: 'Chat with us on WhatsApp.',
      email: 'Email',
      emailBody: 'Write to us anytime.',
      instagram: 'Instagram',
      instagramBody: 'Follow us for Japanese tips.',
    },
  },
  validation: {
    required: 'This field is required.',
    email: 'Enter a valid email address.',
    minLength: 'Must be at least {min} characters.',
    maxLength: 'Must be at most {max} characters.',
    passwordStrength: 'Use at least 8 characters, including a letter and a number.',
    passwordMatch: 'Passwords do not match.',
    selectOption: 'Please choose an option.',
    formErrors: 'Please correct the highlighted fields.',
  },
  auth: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    unavailableTitle: 'Accounts are coming soon',
    unavailableBody:
      'Online accounts are not open yet. To join a course now, contact us and we will help you get started.',
    login: {
      meta: { title: 'Login', description: 'Log in to your account.' },
      title: 'Welcome back',
      subtitle: 'Log in to continue learning Japanese.',
      email: 'Email',
      password: 'Password',
      submit: 'Login', // SPEC
      forgot: 'Forgot Password', // SPEC
      createAccount: 'Create Account', // SPEC
      noAccount: 'New here?',
    },
    register: {
      meta: { title: 'Create your account', description: 'Create your account and start learning Japanese.' },
      title: 'Create your account',
      subtitle: 'It only takes a few minutes.',
      fullName: 'Full Name',
      email: 'Email',
      password: 'Password',
      passwordHint: 'At least 8 characters, including a letter and a number.',
      confirmPassword: 'Confirm Password',
      preferredLanguage: 'Preferred Language',
      languageOptions: { ar: 'Arabic', en: 'English' },
      japaneseLevel: 'Japanese Level',
      chooseLevel: 'Choose your level',
      consent: 'By creating an account, you agree to our {terms} and {privacy}.',
      submit: 'Create Account',
      haveAccount: 'Already have an account?',
      login: 'Login',
    },
    forgot: {
      meta: { title: 'Forgot password', description: 'Reset your password.' },
      title: 'Forgot your password?',
      subtitle: 'Enter your email and we will send you a link to reset your password.',
      email: 'Email',
      submit: 'Send reset link',
      backToLogin: 'Back to login',
      sent: 'If an account exists for this email, we have sent a link to reset your password. Check your inbox.',
    },
    reset: {
      meta: { title: 'Choose a new password', description: 'Reset your password.' },
      title: 'Choose a new password',
      subtitle: 'Enter a new password for your account.',
      password: 'New password',
      confirmPassword: 'Confirm new password',
      submit: 'Save new password',
      success: 'Your password has been changed. You can now log in.',
      invalidLink: 'This link is invalid or has expired.',
      requestNew: 'Request a new link',
    },
    verify: {
      meta: { title: 'Email verification', description: 'Verify your email address.' },
      successTitle: 'Your email is verified',
      successBody: 'Thank you! Your email address has been confirmed.',
      failedTitle: 'This link is invalid or has expired',
      failedBody: 'Log in to your account to request a new verification email.',
    },
    errors: {
      invalidCredentials: 'Email or password is incorrect.',
      emailTaken: 'An account already exists with this email. Try logging in instead.',
      rateLimited: 'Too many attempts. Please wait a few minutes and try again.',
    },
  },
  account: {
    meta: { title: 'My account', description: 'Your account.' },
    eyebrow: 'My account',
    greeting: 'Welcome, {name}',
    subtitle: 'Manage your account and subscription.',
    profileTitle: 'Profile',
    fullName: 'Full name',
    email: 'Email',
    emailVerified: 'Verified',
    emailNotVerified: 'Not verified yet',
    resendVerification: 'Send verification email again',
    verificationSent: 'Verification email sent. Check your inbox.',
    preferredLanguage: 'Preferred language',
    japaneseLevel: 'Japanese level',
    roles: 'Account type',
    roleLabels: { student: 'Student', teacher: 'Teacher', admin: 'Administrator' },
    subscriptionTitle: 'Subscription',
    noSubscription: 'You do not have an active subscription yet.',
    choosePlan: 'Choose a plan',
    coursesTitle: 'My courses',
    coursesSoon: 'Your learning space (lessons, live-class schedule and progress) is coming soon.',
    browseCourses: 'Browse courses',
    adminNote: 'Administrator tools will be available in a future version.',
    logout: 'Log out',
  },
  emails: {
    greeting: 'Hello {name},',
    signature: 'The {brand} team',
    ignore: 'If you did not request this, you can ignore this email.',
    verifySubject: 'Confirm your email address',
    verifyBody: 'Welcome to {brand}! Please confirm your email address by opening this link:',
    resetSubject: 'Reset your password',
    resetBody:
      'We received a request to reset your password. Open this link to choose a new one (valid for 1 hour):',
  },
  checkout: {
    meta: { title: 'Checkout', description: 'Confirm your subscription.' },
    eyebrow: 'Checkout',
    title: 'Confirm your subscription',
    subtitle: 'Review your plan before subscribing.',
    selectedPlan: 'Selected plan',
    changePlan: 'Change plan',
    monthlyPrice: 'Monthly price',
    planFeatures: 'Plan features',
    amount: 'Amount',
    amountDue: 'Amount due each month',
    billingFrequency: 'Billing frequency',
    conditionsTitle: 'Subscription conditions',
    conditions: [
      'Your subscription renews automatically every month until you cancel.',
      'Access to your plan’s courses and features starts after your payment is confirmed.',
      'Prices, taxes and currency are shown before you pay.',
    ],
    cancellationTitle: 'Cancellation',
    cancellation: [
      'You can cancel your subscription at any time.',
      'After cancelling, you keep access until the end of the current billing period.',
      'See our {refund} for details.',
    ],
    paymentMethodTitle: 'Payment method',
    paymentMethodBody:
      'Payment is handled by a secure, certified payment provider. We never see or store your card details.',
    paymentMethodPending: 'Available payment methods will be shown here once online payments are activated.',
    confirm: 'Confirm Subscription', // SPEC
    comingSoonTitle: 'Online payments are being activated',
    comingSoonBody:
      'Subscriptions will be available online very soon. Contact us and we will help you subscribe in the meantime. No payment has been taken.',
    redirectNote: 'You will be redirected to our payment partner to complete your subscription securely.',
    agree: 'By confirming, you agree to our {terms} and {refund}.',
    noPlanTitle: 'Choose a plan first',
    noPlanBody: 'Please select a subscription plan to continue.',
    choosePlan: 'Choose a plan',
  },
  success: {
    meta: { title: 'Subscription activated', description: 'Your subscription is active.' },
    title: 'Welcome to our Japanese learning community! 🎉', // SPEC
    body: 'Your subscription has been successfully activated.', // SPEC
    cta: 'Go to My Courses', // SPEC
    nextSteps: 'A confirmation email with your next steps is on its way.',
    previewNotice: 'Design preview — this page is only shown after a verified payment.',
  },
  notFound: {
    meta: { title: 'Page not found', description: 'The page you are looking for does not exist.' },
    code: '404',
    title: 'This page could not be found',
    body: 'The link may be broken or the page may have moved. Let’s get you back on track.',
    home: 'Back to home',
    courses: 'Browse courses',
  },
  legal: {
    draftBanner:
      'DRAFT TEMPLATE — This document is a placeholder and has not been reviewed by a lawyer. It is not legal advice and must be reviewed and completed before launch.',
    lastUpdated: 'Last updated: {date}',
    onThisPage: 'Legal documents',
  },
  placeholders: {
    testimonial: 'Student testimonial goes here.', // SPEC
    studentName: 'Student Name', // SPEC
    country: 'Country', // SPEC
  },
} as const;
