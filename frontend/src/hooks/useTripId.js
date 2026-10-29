import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

/**
 * Pages such as /budget and /itinerary need to know which trip they belong to.
 * The id travels in the URL (?tripId=12) so refreshing the page keeps working.
 * If it is missing (e.g. the Navbar "Budget" link) we open the user's most recent trip.
 */
export default function useTripId() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tripId = params.get('tripId');
  const [resolving, setResolving] = useState(!tripId);
  const [noTrips, setNoTrips] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (tripId) {
      setResolving(false);
      return undefined;
    }
    let alive = true;
    api
      .listTrips()
      .then((trips) => {
        if (!alive) return;
        if (trips.length === 0) {
          setNoTrips(true);
          setResolving(false);
        } else {
          navigate(`${location.pathname}?tripId=${trips[0].id}`, { replace: true });
        }
      })
      .catch((e) => {
        if (alive) {
          setError(e);
          setResolving(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [tripId, navigate, location.pathname]);

  return { tripId, resolving, noTrips, error };
}
