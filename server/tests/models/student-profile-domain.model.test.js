const {
  sequelize,
  User,
  University,
  Program,
  StudentProfile,
  Skill,
  StudentSkill,
  Interest,
  StudentInterest,
  ResearchArea,
  StudentResearchInterest,
  Language,
  StudentLanguage,
  StudentCertification,
  StudentAchievement,
  StudentGoal,
} = require('../../src/models');

afterAll(() => sequelize.close());

describe('StudentProfile model', () => {
  it('requires userId and universityId but not programId', () => {
    const attrs = StudentProfile.rawAttributes;
    expect(attrs.userId.allowNull).toBe(false);
    expect(attrs.universityId.allowNull).toBe(false);
    expect(attrs.programId.allowNull).toBe(true);
  });

  it('enforces one profile per user', () => {
    expect(StudentProfile.rawAttributes.userId.unique).toBe(true);
  });

  it('accepts the documented academic statuses and defaults to ACTIVE', () => {
    expect(StudentProfile.rawAttributes.academicStatus.values).toEqual([
      'ACTIVE',
      'ON_LEAVE',
      'GRADUATED',
      'SUSPENDED',
      'WITHDRAWN',
    ]);
    expect(StudentProfile.rawAttributes.academicStatus.defaultValue).toBe('ACTIVE');
  });

  it('accepts the documented visibility levels and defaults to ACADEMIC_NETWORK', () => {
    expect(StudentProfile.rawAttributes.profileVisibility.values).toEqual([
      'PUBLIC',
      'ACADEMIC_NETWORK',
      'UNIVERSITY_ONLY',
      'CONNECTIONS_ONLY',
      'PRIVATE',
    ]);
    expect(StudentProfile.rawAttributes.profileVisibility.defaultValue).toBe('ACADEMIC_NETWORK');
  });

  it('accepts the documented availability statuses and defaults to NOT_SPECIFIED', () => {
    expect(StudentProfile.rawAttributes.availabilityStatus.values).toEqual([
      'NOT_SPECIFIED',
      'AVAILABLE',
      'LIMITED',
      'NOT_AVAILABLE',
    ]);
    expect(StudentProfile.rawAttributes.availabilityStatus.defaultValue).toBe('NOT_SPECIFIED');
  });

  it('is soft-deletable and cascades with its user, but not its university', () => {
    expect(StudentProfile.options.paranoid).toBe(true);
    expect(User.associations.studentProfile.options.onDelete).toBe('CASCADE');
    expect(University.associations.studentProfiles.options.onDelete).toBe('RESTRICT');
    expect(Program.associations.studentProfiles.options.onDelete).toBe('SET NULL');
  });

  it('has a composite unique index on (university_id, student_identifier)', () => {
    const uniqueIndex = StudentProfile.options.indexes.find(
      (index) => index.unique && index.fields.includes('student_identifier')
    );
    expect(uniqueIndex.fields).toEqual(['university_id', 'student_identifier']);
  });
});

describe('Skill / Interest / ResearchArea / Language catalogs', () => {
  it('Skill and Interest carry a uuid, unlike roles/permissions, since they are URL-addressable', () => {
    expect(Skill.rawAttributes.uuid).toBeDefined();
    expect(Interest.rawAttributes.uuid).toBeDefined();
    expect(Language.rawAttributes.uuid).toBeDefined();
    expect(ResearchArea.rawAttributes.uuid).toBeDefined();
  });

  it('catalog tables are not paranoid — retirement is status: INACTIVE, not a soft delete', () => {
    expect(Skill.options.paranoid).toBeFalsy();
    expect(Interest.options.paranoid).toBeFalsy();
    expect(ResearchArea.options.paranoid).toBeFalsy();
    expect(Language.options.paranoid).toBeFalsy();
  });

  it('ResearchArea supports a self-referential parent/children hierarchy', () => {
    expect(ResearchArea.associations.parent).toBeDefined();
    expect(ResearchArea.associations.children).toBeDefined();
    expect(ResearchArea.associations.children.options.onDelete).toBe('SET NULL');
  });
});

describe('Student join tables (skills/interests/research-interests/languages)', () => {
  it('are pure relational facts: no uuid column, matching user_roles precedent', () => {
    expect(StudentSkill.rawAttributes.uuid).toBeUndefined();
    expect(StudentInterest.rawAttributes.uuid).toBeUndefined();
    expect(StudentResearchInterest.rawAttributes.uuid).toBeUndefined();
    expect(StudentLanguage.rawAttributes.uuid).toBeUndefined();
  });

  it('each enforces a unique (student_profile_id, catalog_id) pair', () => {
    expect(StudentSkill.options.indexes.find((i) => i.unique).fields).toEqual(['student_profile_id', 'skill_id']);
    expect(StudentInterest.options.indexes.find((i) => i.unique).fields).toEqual([
      'student_profile_id',
      'interest_id',
    ]);
    expect(StudentResearchInterest.options.indexes.find((i) => i.unique).fields).toEqual([
      'student_profile_id',
      'research_area_id',
    ]);
    expect(StudentLanguage.options.indexes.find((i) => i.unique).fields).toEqual([
      'student_profile_id',
      'language_id',
    ]);
  });

  it('proficiency/interest levels are self-reported enums, never certified qualifications', () => {
    expect(StudentSkill.rawAttributes.proficiencyLevel.values).toEqual([
      'BEGINNER',
      'INTERMEDIATE',
      'ADVANCED',
      'EXPERT',
    ]);
    expect(StudentResearchInterest.rawAttributes.interestLevel.values).toEqual([
      'CURIOUS',
      'INTERESTED',
      'ACTIVE',
      'ADVANCED',
    ]);
    expect(StudentLanguage.rawAttributes.proficiencyLevel.values).toEqual([
      'BASIC',
      'CONVERSATIONAL',
      'PROFESSIONAL',
      'FLUENT',
      'NATIVE',
    ]);
  });
});

describe('StudentCertification / StudentAchievement / StudentGoal', () => {
  it('are URL-addressable standalone records: uuid + paranoid, unlike the join tables', () => {
    for (const Model of [StudentCertification, StudentAchievement, StudentGoal]) {
      expect(Model.rawAttributes.uuid).toBeDefined();
      expect(Model.options.paranoid).toBe(true);
    }
  });

  it('StudentGoal accepts the documented goal types and statuses, defaulting status to ACTIVE', () => {
    expect(StudentGoal.rawAttributes.goalType.values).toEqual([
      'RESEARCH',
      'MENTORSHIP',
      'INTERNSHIP',
      'PROJECT',
      'SCHOLARSHIP',
      'GRADUATE_STUDY',
      'CAREER',
      'COMPETITION',
      'OTHER',
    ]);
    expect(StudentGoal.rawAttributes.status.values).toEqual(['ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED']);
    expect(StudentGoal.rawAttributes.status.defaultValue).toBe('ACTIVE');
  });

  it('all three cascade with their student profile', () => {
    expect(StudentProfile.associations.certifications.options.onDelete).toBe('CASCADE');
    expect(StudentProfile.associations.achievements.options.onDelete).toBe('CASCADE');
    expect(StudentProfile.associations.goals.options.onDelete).toBe('CASCADE');
  });
});
