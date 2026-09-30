import { useCallback, useEffect, useState } from 'react';

import * as studentService from '../services/studentService';

/**
 * Shared across every /student/profile/* page (skills, interests,
 * research, certifications, achievements, goals all need to know
 * whether a profile exists before they can do anything) — pulled into
 * one hook once the third page needed the same fetch/loading/error
 * dance, per this project's "no premature abstraction" convention.
 *
 * `notFound` distinguishes "still loading" from "confirmed: no profile
 * yet" so pages can render a clear call-to-action instead of a generic
 * error.
 */
const useMyProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const res = await studentService.getMyProfile();
      setProfile(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { profile, loading, notFound, reload };
};

export default useMyProfile;
