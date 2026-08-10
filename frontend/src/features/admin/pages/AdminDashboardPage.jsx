import {
  useEffect,
  useState,
} from 'react';

import {
  approveProviderApplication,
  getPendingProviderApplications,
  rejectProviderApplication,
} from '../api/adminApi';

function AdminDashboardPage() {
  const [applications, setApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionUserId, setActionUserId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
  let ignoreResult = false;

  async function loadInitialApplications() {
    try {
      const result = await getPendingProviderApplications();

      if (ignoreResult) {
        return;
      }

      setApplications(
        result?.data?.applications ?? []
      );
    } catch (error) {
      if (ignoreResult) {
        return;
      }

      setErrorMessage(
        error.response?.data?.message ||
          'Could not load pending applications.'
      );
    } finally {
      if (!ignoreResult) {
        setIsLoading(false);
      }
    }
  }

  void loadInitialApplications();

  return () => {
    ignoreResult = true;
  };
}, []);

  async function handleApprove(userId) {
    setActionUserId(userId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await approveProviderApplication(userId);

      setApplications((currentApplications) =>
        currentApplications.filter(
          (application) => application._id !== userId
        )
      );

      setSuccessMessage(
        'Provider application approved successfully.'
      );
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          'Could not approve this application.'
      );
    } finally {
      setActionUserId('');
    }
  }

  async function handleReject(userId) {
    setActionUserId(userId);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await rejectProviderApplication(userId);

      setApplications((currentApplications) =>
        currentApplications.filter(
          (application) => application._id !== userId
        )
      );

      setSuccessMessage(
        'Provider application rejected successfully.'
      );
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          'Could not reject this application.'
      );
    } finally {
      setActionUserId('');
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Administration
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Provider Applications
        </h1>

        <p className="mt-2 text-slate-600">
          Review pending hotel and guide accounts before they can use
          provider features.
        </p>
      </div>

      {errorMessage && (
        <div
          className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          role="status"
        >
          {successMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-600">
            Loading pending applications...
          </p>
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            No pending applications
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            All hotel and guide applications have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => {
            const isProcessing =
              actionUserId === application._id;

            return (
              <article
                key={application._id}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-slate-900">
                        {application.name}
                      </h2>

                      <span className="rounded-full bg-[#E9F6F0] px-3 py-1 text-xs font-semibold capitalize text-[#075D42]">
                        {application.role}
                      </span>
                    </div>

                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p>
                        <span className="font-medium text-slate-800">
                          Email:
                        </span>{' '}
                        {application.email}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Phone:
                        </span>{' '}
                        {application.phone}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Status:
                        </span>{' '}
                        <span className="capitalize">
                          {application.approvalStatus}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        handleReject(application._id)
                      }
                      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() =>
                        handleApprove(application._id)
                      }
                      className="rounded-lg bg-[#08734F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#075D42] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isProcessing
                        ? 'Processing...'
                        : 'Approve'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default AdminDashboardPage;