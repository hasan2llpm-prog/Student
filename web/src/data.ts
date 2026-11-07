export type StoryFrame = {
  image: string
  caption: string
  time: string
}

export type Story = {
  id: string
  name: string
  handle: string
  avatar: string
  isMine?: boolean
  viewed?: boolean
  frames: StoryFrame[]
}

export type Post = {
  id: string
  author: string
  handle: string
  avatar: string
  time: string
  text: string
  images: string[]
  likes: number
  comments: number
  shares: number
  liked?: boolean
  verified?: boolean
}

export const stories: Story[] = [
  {
    id: 'mine',
    name: 'قصتي',
    handle: 'you',
    avatar: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/etf6GvqFUbUxF8CBhvbJCJ.jpg',
    isMine: true,
    frames: [
      {
        image: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/tDvm2hTBGTnFBGQg9cZtin.jpg',
        caption: 'جلسة هادئة، وكلمة جديدة قبل بداية اليوم.',
        time: 'منذ 5 دقائق',
      },
    ],
  },
  {
    id: 'maya',
    name: 'Maya Hassan',
    handle: 'maya.h',
    avatar: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/egLaQQSwpjo3sAUaeu2NHJ.jpg',
    frames: [
      {
        image: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/egLaQQSwpjo3sAUaeu2NHJ.jpg',
        caption: 'Small steps make a strong habit.',
        time: 'منذ 12 دقيقة',
      },
      {
        image: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/b4EAfrYPCSocYChj4jionf.jpg',
        caption: 'مراجعة سريعة قبل المحاضرة.',
        time: 'منذ 10 دقائق',
      },
    ],
  },
  {
    id: 'omar',
    name: 'Omar Ali',
    handle: 'omar.learns',
    avatar: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/cyn6nT5NqanrMPTDMcA82E.jpg',
    frames: [
      {
        image: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/cyn6nT5NqanrMPTDMcA82E.jpg',
        caption: 'Today\'s phrase: keep going.',
        time: 'منذ 25 دقيقة',
      },
    ],
  },
  {
    id: 'rasha',
    name: 'Rasha Karim',
    handle: 'rasha.reads',
    avatar: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/UHpBeeeuKwAVzfBF5LYKNL.jpg',
    frames: [
      {
        image: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/UHpBeeeuKwAVzfBF5LYKNL.jpg',
        caption: 'A quiet library is a great teacher.',
        time: 'منذ 42 دقيقة',
      },
    ],
    viewed: true,
  },
  {
    id: 'zainab',
    name: 'Zainab Noor',
    handle: 'zainab.n',
    avatar: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/HgsznxZnS5UAB5r5S7amxK.jpg',
    frames: [
      {
        image: 'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/HgsznxZnS5UAB5r5S7amxK.jpg',
        caption: 'New words, real conversations.',
        time: 'منذ ساعة',
      },
    ],
  },
]

export const posts: Post[] = [
  {
    id: 'post-1',
    author: 'Maya Hassan',
    handle: 'maya.h',
    avatar: stories[1].avatar,
    time: 'منذ 18 دقيقة',
    text: 'اليوم جرّبت طريقة مختلفة لمراجعة المفردات: كلمة واحدة في جملة، ثم نطقها بصوت عالٍ. الفرق في التذكر واضح جدًا.',
    images: [
      'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/b4EAfrYPCSocYChj4jionf.jpg',
      'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/tDvm2hTBGTnFBGQg9cZtin.jpg',
      'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/T6EjW2oZtGSDLjaqoB7KLh.jpg',
      'https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/egLaQQSwpjo3sAUaeu2NHJ.jpg',
    ],
    likes: 248,
    comments: 31,
    shares: 8,
    verified: true,
  },
  {
    id: 'post-2',
    author: 'Omar Ali',
    handle: 'omar.learns',
    avatar: stories[2].avatar,
    time: 'منذ ساعة',
    text: 'كلمة اليوم: improve — لا تكتفِ بحفظ معناها، استخدمها في جملة تخص يومك.',
    images: ['https://files.manuscdn.com/search-media/310519664037020919/K1HWNsQS0qxkq1kesJgb09/tDvm2hTBGTnFBGQg9cZtin.jpg'],
    likes: 96,
    comments: 12,
    shares: 4,
  },
]

export const vocabulary = {
  word: 'improve',
  meaning: 'يُحسّن / يطوّر',
  example: 'Small habits improve your English every day.',
  progress: 12,
  total: 20,
}
