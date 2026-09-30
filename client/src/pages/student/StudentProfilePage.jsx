import { Link } from 'react-router-dom';

import useMyProfile from '../../hooks/useMyProfile';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import LoadingSpinner from '../../components/LoadingSpinner';
import CreateProfileForm from './CreateProfileForm';

const Section = ({ title, children }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <h2 className="text-sm font-medium text-slate-900">{title}</h2>
    <div className="mt-3">{children}</div>
  </div>
);

const Pill = ({ children }) => (
  <span className="mr-2 mb-2 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
    {children}
  </span>
);

/** §49: the completeness score and suggestions come straight from the backend — never recomputed here. */
const CompletenessCard = ({ completeness }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4">
    <h2 className="text-sm font-medium text-slate-900">Profile completeness</h2>
    <div className="mt-2 flex items-center gap-3">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${completeness.score}%` }} />
      </div>
      <span className="text-sm font-semibold text-slate-900">{completeness.score}%</span>
    </div>
    {completeness.missing.length > 0 && (
      <ul className="mt-3 space-y-1 text-sm text-slate-600">
        {completeness.missing.map((item) => (
          <li key={item.label} className="flex justify-between">
            <span>{item.label}</span>
            <span className="text-brand-700">+{item.points}%</span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const StudentProfilePage = () => {
  const { profile, loading, notFound, reload } = useMyProfile();

  if (loading) return <LoadingSpinner label="Loading your profile…" />;

  if (notFound) {
    return (
      <div>
        <PageHeader title="Student Profile" />
        <CreateProfileForm onCreated={reload} />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">
              {profile.user.display_name || `${profile.user.first_name} ${profile.user.last_name}`}
            </h1>
            {profile.headline && <p className="mt-1 text-sm text-slate-600">{profile.headline}</p>}
            <p className="mt-1 text-sm text-slate-500">{profile.university.name}</p>
            {profile.program && (
              <p className="text-sm text-slate-500">
                {profile.program.name} ({profile.program.degree_level})
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={profile.academic_status} />
            <Link
              to="/student/profile/edit"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Edit Profile
            </Link>
          </div>
        </div>
      </div>

      <CompletenessCard completeness={profile.profile_completeness} />

      {profile.bio && (
        <Section title="About">
          <p className="whitespace-pre-line text-sm text-slate-700">{profile.bio}</p>
        </Section>
      )}

      <Section title="Skills">
        {profile.skills.length === 0 ? (
          <p className="text-sm text-slate-500">No skills added yet.</p>
        ) : (
          <div>
            {profile.skills.map((skill) => (
              <Pill key={skill.id}>
                {skill.name} · {skill.proficiency_level}
              </Pill>
            ))}
          </div>
        )}
      </Section>

      <Section title="Academic Interests">
        {profile.interests.length === 0 ? (
          <p className="text-sm text-slate-500">No interests added yet.</p>
        ) : (
          <div>
            {profile.interests.map((interest) => (
              <Pill key={interest.id}>{interest.name}</Pill>
            ))}
          </div>
        )}
      </Section>

      <Section title="Research Interests">
        {profile.research_interests.length === 0 ? (
          <p className="text-sm text-slate-500">No research interests added yet.</p>
        ) : (
          <div>
            {profile.research_interests.map((area) => (
              <Pill key={area.id}>
                {area.name} · {area.interest_level}
              </Pill>
            ))}
          </div>
        )}
      </Section>

      <Section title="Languages">
        {profile.languages.length === 0 ? (
          <p className="text-sm text-slate-500">No languages added yet.</p>
        ) : (
          <div>
            {profile.languages.map((language) => (
              <Pill key={language.id}>
                {language.name} · {language.proficiency_level}
              </Pill>
            ))}
          </div>
        )}
      </Section>

      <Section title="Academic Goals">
        {profile.goals.length === 0 ? (
          <p className="text-sm text-slate-500">No goals added yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {profile.goals.map((goal) => (
              <li key={goal.id} className="flex items-center justify-between">
                <span>
                  {goal.title} <span className="text-slate-400">({goal.goal_type})</span>
                </span>
                <StatusBadge status={goal.status} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Certifications">
        {profile.certifications.length === 0 ? (
          <p className="text-sm text-slate-500">No certifications added yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {profile.certifications.map((cert) => (
              <li key={cert.id}>
                {cert.name}
                {cert.issuing_organization && <span className="text-slate-500"> · {cert.issuing_organization}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Achievements">
        {profile.achievements.length === 0 ? (
          <p className="text-sm text-slate-500">No achievements added yet.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-700">
            {profile.achievements.map((achievement) => (
              <li key={achievement.id}>
                {achievement.title}
                {achievement.organization && <span className="text-slate-500"> · {achievement.organization}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
};

export default StudentProfilePage;
