import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create a demo user
  const passwordHash = await bcrypt.hash('demo123', 12)
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@mcqmaster.com' },
    update: {},
    create: {
      email: 'demo@mcqmaster.com',
      name: 'Demo User',
      passwordHash,
    },
  })

  console.log('Created user:', user.email)

  // Create user settings
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      timezone: 'UTC',
      theme: 'SYSTEM',
      masteryThreshold: 3,
      easeFactorDefault: 2.5,
    },
  })

  // Create sample subjects
  const biology = await prisma.subject.upsert({
    where: { id: 'subject-biology' },
    update: {},
    create: {
      id: 'subject-biology',
      name: 'Biology',
      description: 'Life sciences and biology topics',
      icon: 'Heart',
      color: '#10B981',
      position: 0,
      userId: user.id,
    },
  })

  const chemistry = await prisma.subject.upsert({
    where: { id: 'subject-chemistry' },
    update: {},
    create: {
      id: 'subject-chemistry',
      name: 'Chemistry',
      description: 'Chemical reactions, compounds, and principles',
      icon: 'FlaskConical',
      color: '#8B5CF6',
      position: 1,
      userId: user.id,
    },
  })

  const physics = await prisma.subject.upsert({
    where: { id: 'subject-physics' },
    update: {},
    create: {
      id: 'subject-physics',
      name: 'Physics',
      description: 'Mechanics, thermodynamics, and modern physics',
      icon: 'Atom',
      color: '#3B82F6',
      position: 2,
      userId: user.id,
    },
  })

  console.log('Created subjects')

  // Create sample topics
  const cellBiology = await prisma.topic.upsert({
    where: { id: 'topic-cell-biology' },
    update: {},
    create: {
      id: 'topic-cell-biology',
      name: 'Cell Biology',
      description: 'Cell structure, organelles, and cellular processes',
      position: 0,
      subjectId: biology.id,
      userId: user.id,
    },
  })

  const genetics = await prisma.topic.upsert({
    where: { id: 'topic-genetics' },
    update: {},
    create: {
      id: 'topic-genetics',
      name: 'Genetics',
      description: 'Inheritance, DNA, and gene expression',
      position: 1,
      subjectId: biology.id,
      userId: user.id,
    },
  })

  const organicChemistry = await prisma.topic.upsert({
    where: { id: 'topic-organic-chemistry' },
    update: {},
    create: {
      id: 'topic-organic-chemistry',
      name: 'Organic Chemistry',
      description: 'Carbon compounds and reactions',
      position: 0,
      subjectId: chemistry.id,
      userId: user.id,
    },
  })

  console.log('Created topics')

  // Create sample questions
  const questions = [
    {
      text: 'What is the powerhouse of the cell?',
      explanation: 'Mitochondria generate ATP through cellular respiration, earning them the nickname "powerhouse of the cell".',
      hint: 'Think about ATP production',
      difficulty: 'EASY' as const,
      subjectId: biology.id,
      topicId: cellBiology.id,
      options: [
        { label: 'A' as const, text: 'Nucleus' },
        { label: 'B' as const, text: 'Mitochondria' },
        { label: 'C' as const, text: 'Ribosome' },
        { label: 'D' as const, text: 'Golgi apparatus' },
      ],
      correctLabel: 'B' as const,
      tags: ['cell-biology', 'organelles', 'high-yield'],
    },
    {
      text: 'Which phase of mitosis involves the alignment of chromosomes at the metaphase plate?',
      explanation: 'During metaphase, chromosomes align at the cell\'s equatorial plane (metaphase plate) before being separated.',
      difficulty: 'MEDIUM' as const,
      subjectId: biology.id,
      topicId: cellBiology.id,
      options: [
        { label: 'A' as const, text: 'Prophase' },
        { label: 'B' as const, text: 'Metaphase' },
        { label: 'C' as const, text: 'Anaphase' },
        { label: 'D' as const, text: 'Telophase' },
      ],
      correctLabel: 'B' as const,
      tags: ['cell-biology', 'mitosis', 'cell-division'],
    },
    {
      text: 'What is the molecular structure of DNA?',
      explanation: 'DNA is a double helix composed of two complementary strands of nucleotides.',
      hint: 'Watson and Crick discovered this structure',
      difficulty: 'EASY' as const,
      subjectId: biology.id,
      topicId: genetics.id,
      options: [
        { label: 'A' as const, text: 'Single helix' },
        { label: 'B' as const, text: 'Double helix' },
        { label: 'C' as const, text: 'Triple helix' },
        { label: 'D' as const, text: 'Linear chain' },
      ],
      correctLabel: 'B' as const,
      tags: ['genetics', 'dna', 'molecular-biology'],
    },
    {
      text: 'In a Mendelian monohybrid cross between two heterozygotes (Aa × Aa), what is the phenotypic ratio?',
      explanation: 'The genotypic ratio is 1 AA : 2 Aa : 1 aa. If A is dominant, the phenotypic ratio is 3:1.',
      difficulty: 'MEDIUM' as const,
      subjectId: biology.id,
      topicId: genetics.id,
      options: [
        { label: 'A' as const, text: '1:1' },
        { label: 'B' as const, text: '3:1' },
        { label: 'C' as const, text: '1:2:1' },
        { label: 'D' as const, text: '9:3:3:1' },
      ],
      correctLabel: 'B' as const,
      tags: ['genetics', 'mendelian', 'inheritance'],
    },
    {
      text: 'What is the IUPAC name for CH₃CH₂OH?',
      explanation: 'Ethanol is the systematic IUPAC name for the two-carbon alcohol.',
      difficulty: 'EASY' as const,
      subjectId: chemistry.id,
      topicId: organicChemistry.id,
      options: [
        { label: 'A' as const, text: 'Methanol' },
        { label: 'B' as const, text: 'Ethanol' },
        { label: 'C' as const, text: 'Propanol' },
        { label: 'D' as const, text: 'Butanol' },
      ],
      correctLabel: 'B' as const,
      tags: ['organic-chemistry', 'nomenclature', 'alcohols'],
    },
    {
      text: 'Which functional group is present in carboxylic acids?',
      explanation: 'Carboxylic acids contain the carboxyl group (-COOH) which consists of a carbonyl and hydroxyl group.',
      difficulty: 'MEDIUM' as const,
      subjectId: chemistry.id,
      topicId: organicChemistry.id,
      options: [
        { label: 'A' as const, text: '-OH' },
        { label: 'B' as const, text: '-CHO' },
        { label: 'C' as const, text: '-COOH' },
        { label: 'D' as const, text: '-CO-' },
      ],
      correctLabel: 'C' as const,
      tags: ['organic-chemistry', 'functional-groups', 'carboxylic-acids'],
    },
  ]

  for (const q of questions) {
    const existing = await prisma.question.findFirst({
      where: { text: q.text, userId: user.id },
    })

    if (!existing) {
      const { correctLabel, ...questionData } = q
      const question = await prisma.question.create({
        data: {
          ...questionData,
          userId: user.id,
          options: { create: q.options },
          answer: { create: { correctLabel, explanation: q.explanation } },
          tags: { create: q.tags.map(name => ({ name, color: null })) },
        },
      })

      // Create review item
      await prisma.reviewItem.create({
        data: {
          questionId: question.id,
          userId: user.id,
          status: 'NEW',
          nextReviewAt: new Date(),
        },
      })
    }
  }

  console.log('Created sample questions')

  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })