// Content for the mini go-to-market plan. Edit here; the page renders from this file.
// All numbers are planning targets, not measured results.

export const product = {
	name: 'TBI',
	tagline: 'A peer-support forum for everyday mental wellness',
	summary:
		'A moderated, anonymous-by-default forum where people share what they are going through, learn coping skills from peers, and find their way to professional help when they need it.',
	positioning:
		'For adults who want to talk about stress, anxiety, burnout or low mood without the noise of mainstream social media, TBI is a calm, moderated peer community that feels safe from the first post. Unlike general social platforms, every space is moderated by trained volunteers, posts are anonymous by default, and crisis resources are one tap away.'
};

export const problem = [
	'Many people who are struggling never talk to anyone, and a lot of them start by searching online at night.',
	'General social platforms are loud, performative, and often make things worse for vulnerable users.',
	'Therapy has waitlists and costs money. Peer support fills the gap but is hard to find in a safe, moderated form.'
];

export const segments = [
	{
		name: 'Quiet strugglers',
		who: 'Adults 22-40 dealing with stress, anxiety or burnout who have never sought help.',
		need: 'Anonymity and a low-pressure first step.',
		reach: 'Search (SEO), Reddit, and wellness creators',
		priority: 'Primary'
	},
	{
		name: 'Between-sessions seekers',
		who: 'People already in therapy or on a waitlist who want support between appointments.',
		need: 'Structured topics, coping-skill threads, and accountability.',
		reach: 'Therapist and clinic referrals, student counseling centers',
		priority: 'Primary'
	},
	{
		name: 'Supporters',
		who: 'Friends, family and caregivers of someone who is struggling.',
		need: 'Guidance on how to help without burning out.',
		reach: 'Caregiver groups and nonprofit partners',
		priority: 'Secondary'
	}
];

export const pillars = [
	{
		title: 'Safe by design',
		line: 'Anonymous by default, moderated by trained volunteers, and crisis help always visible.'
	},
	{
		title: 'People like you',
		line: 'Real peers who have been there, not influencers or bots.'
	},
	{
		title: 'Small steps count',
		line: 'Read first, post when ready. No streaks, no pressure, no likes race.'
	}
];

export const channels = [
	{
		name: 'Search content (SEO)',
		type: 'Owned',
		tactic:
			'Public, moderator-reviewed guides answering high-intent searches ("how to cope with burnout").',
		priority: 'High'
	},
	{
		name: 'Partner referrals',
		type: 'Partnerships',
		tactic:
			'Co-branded spaces with campus counseling centers, clinics and mental health nonprofits.',
		priority: 'High'
	},
	{
		name: 'Community seeding',
		type: 'Earned',
		tactic: 'Invite 50 founding members and 15 volunteer moderators before public launch.',
		priority: 'High'
	},
	{
		name: 'Creator collaborations',
		type: 'Earned',
		tactic: 'Small wellness creators host monthly AMAs inside the forum.',
		priority: 'Medium'
	},
	{
		name: 'Email newsletter',
		type: 'Owned',
		tactic: 'Weekly digest of the most helpful threads, sent only to members who opt in.',
		priority: 'Medium'
	},
	{
		name: 'Paid social (test)',
		type: 'Paid',
		tactic: 'Small, carefully worded tests; no targeting based on health conditions.',
		priority: 'Low'
	}
];

export const phases = [
	{
		label: 'Weeks 1-4',
		name: 'Foundation',
		items: [
			'Write community guidelines and the crisis escalation playbook',
			'Recruit and train 15 volunteer moderators',
			'Publish 10 cornerstone SEO guides',
			'Sign 2 pilot partners'
		]
	},
	{
		label: 'Weeks 5-8',
		name: 'Private beta',
		items: [
			'Invite 50 founding members from partner channels',
			'Run weekly feedback calls and fix onboarding friction',
			'Seed 6 topic spaces with welcome threads',
			'Collect stories (with consent) for launch'
		]
	},
	{
		label: 'Weeks 9-12',
		name: 'Public launch',
		items: [
			'Open sign-ups and announce with partners',
			'Start creator AMAs and the weekly digest',
			'Launch a small paid test (if CAC targets look realistic)',
			'Review metrics and decide on the next 90 days'
		]
	}
];

// Funnel targets for the first 90 days.
export const funnel = [
	{ stage: 'Visitors', value: 20000 },
	{ stage: 'Sign-ups', value: 1600 },
	{ stage: 'First post or reply', value: 640 },
	{ stage: 'Weekly active', value: 400 }
];

export const kpis = [
	{ label: 'Visitor to sign-up', target: '8%' },
	{ label: 'Sign-up to first post', target: '40%' },
	{ label: 'Week-4 retention', target: '25%' },
	{ label: 'Median time to first reply', target: 'Under 2 hrs' },
	{ label: 'Flagged posts reviewed in 1 hr', target: '95%' },
	{ label: '"I felt supported" survey', target: '80%+' }
];

// Share of a 90-day budget, in percent.
export const budget = [
	{ item: 'Moderator training and stipends', share: 35 },
	{ item: 'Content and SEO', share: 25 },
	{ item: 'Partnerships and events', share: 20 },
	{ item: 'Paid social tests', share: 10 },
	{ item: 'Tools and analytics', share: 10 }
];

export const safety = [
	{
		title: 'Crisis resources everywhere',
		line: 'A visible "Need help now?" link on every page that points to local crisis lines (988 in the US).'
	},
	{
		title: 'Human moderation',
		line: 'Trained volunteers, a clear escalation path, and a licensed clinical advisor who reviews the playbook.'
	},
	{
		title: 'Privacy first',
		line: 'Anonymous by default, minimal data, no selling data, and no ad targeting based on health conditions.'
	},
	{
		title: 'Clear limits',
		line: 'Peer support is not therapy or medical advice. The product says so plainly during onboarding.'
	}
];

export const risks = [
	{
		risk: 'A member in crisis posts and gets no response',
		mitigation:
			'Keyword triage alerts moderators, crisis banner shows automatically, and on-call moderators cover every hour.'
	},
	{
		risk: 'Empty-room problem at launch',
		mitigation: 'Seed with founding members and moderators; launch with fewer, busier topic spaces.'
	},
	{
		risk: 'Harmful advice or toxic replies',
		mitigation: 'Clear guidelines, pre-moderation for new accounts, and fast removal with feedback.'
	},
	{
		risk: 'Moderator burnout',
		mitigation: 'Shift limits, peer debriefs, stipends, and a moderator-only support space.'
	}
];

export const nextSteps = [
	'Confirm the name and run a trademark check',
	'Recruit a licensed clinical advisor',
	'Shortlist 5 partner organizations and send outreach',
	'Draft community guidelines and the crisis playbook',
	'Set up analytics for the funnel stages above'
];
