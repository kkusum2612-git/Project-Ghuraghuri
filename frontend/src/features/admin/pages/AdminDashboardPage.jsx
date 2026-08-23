import {
  useEffect,
  useState,
} from 'react';

import {
  approveProviderApplication,
  getPendingProviderApplications,
  getRewardSettings,
  rejectProviderApplication,
  updateRewardSettings,
} from '../api/adminApi';


/*
 * ============================================================
 * ADMIN DASHBOARD
 * ============================================================
 *
 * Existing responsibility:
 *
 *   Provider application approval.
 *
 *
 * Rafi Feature 3 adds another section:
 *
 *   Premium & Reward Settings.
 *
 *
 * We keep both features on the same /admin page rather than
 * introducing another admin navigation system solely for six
 * settings.
 */


/*
 * Default values shown temporarily before MongoDB settings load.
 *
 * These match Rafi's backend defaults.
 *
 * The backend remains authoritative.
 */
const DEFAULT_REWARD_SETTINGS = {
  premiumUpgradePrice: 499,

  premiumBaseDiscountPercent: 5,

  pointsPerEligiblePayment: 100,

  pointsPerDiscountStep: 1000,

  discountPercentPerStep: 5,

  maximumDiscountPercent: 50,
};


function AdminDashboardPage() {
  /*
   * ==========================================================
   * EXISTING PROVIDER APPLICATION STATE
   * ==========================================================
   */
  const [
    applications,
    setApplications,
  ] = useState([]);


  const [
    isLoadingApplications,
    setIsLoadingApplications,
  ] = useState(true);


  const [
    actionUserId,
    setActionUserId,
  ] = useState('');


  const [
    applicationError,
    setApplicationError,
  ] = useState('');


  const [
    applicationSuccess,
    setApplicationSuccess,
  ] = useState('');


  /*
   * ==========================================================
   * RAFI FEATURE 3 - REWARD SETTINGS STATE
   * ==========================================================
   */
  const [
    rewardSettings,
    setRewardSettings,
  ] = useState(
    DEFAULT_REWARD_SETTINGS
  );


  const [
    isLoadingRewardSettings,
    setIsLoadingRewardSettings,
  ] = useState(true);


  const [
    isSavingRewardSettings,
    setIsSavingRewardSettings,
  ] = useState(false);


  const [
    rewardSettingsError,
    setRewardSettingsError,
  ] = useState('');


  const [
    rewardSettingsSuccess,
    setRewardSettingsSuccess,
  ] = useState('');


  /*
   * ==========================================================
   * INITIAL PAGE LOAD
   * ==========================================================
   *
   * Provider applications and reward settings are independent.
   *
   * Therefore failure in one section should not prevent the
   * other section from being useful.
   */
  useEffect(() => {
    let ignoreResult =
      false;


    async function loadApplications() {
      try {
        const result =
          await getPendingProviderApplications();


        if (
          ignoreResult
        ) {
          return;
        }


        setApplications(
          result?.data
            ?.applications ??
            []
        );
      } catch (error) {
        if (
          !ignoreResult
        ) {
          setApplicationError(
            error.response?.data
              ?.message ||
              'Could not load pending applications.'
          );
        }
      } finally {
        if (
          !ignoreResult
        ) {
          setIsLoadingApplications(
            false
          );
        }
      }
    }


    async function loadRewardSettings() {
      try {
        const result =
          await getRewardSettings();


        if (
          ignoreResult
        ) {
          return;
        }


        const settings =
          result?.data
            ?.settings;


        if (settings) {
          setRewardSettings({
            premiumUpgradePrice:
              settings.premiumUpgradePrice,

            premiumBaseDiscountPercent:
              settings.premiumBaseDiscountPercent,

            pointsPerEligiblePayment:
              settings.pointsPerEligiblePayment,

            pointsPerDiscountStep:
              settings.pointsPerDiscountStep,

            discountPercentPerStep:
              settings.discountPercentPerStep,

            maximumDiscountPercent:
              settings.maximumDiscountPercent,
          });
        }
      } catch (error) {
        if (
          !ignoreResult
        ) {
          setRewardSettingsError(
            error.response?.data
              ?.message ||
              'Could not load Premium and reward settings.'
          );
        }
      } finally {
        if (
          !ignoreResult
        ) {
          setIsLoadingRewardSettings(
            false
          );
        }
      }
    }


    void loadApplications();

    void loadRewardSettings();


    return () => {
      ignoreResult =
        true;
    };
  }, []);


  /*
   * ----------------------------------------------------------
   * EXISTING PROVIDER APPROVAL
   * ----------------------------------------------------------
   */
  async function handleApprove(
    userId
  ) {
    setActionUserId(
      userId
    );

    setApplicationError('');

    setApplicationSuccess('');


    try {
      await approveProviderApplication(
        userId
      );


      setApplications(
        (
          currentApplications
        ) =>
          currentApplications.filter(
            (application) =>
              application._id !==
              userId
          )
      );


      setApplicationSuccess(
        'Provider application approved successfully.'
      );
    } catch (error) {
      setApplicationError(
        error.response?.data
          ?.message ||
          'Could not approve this application.'
      );
    } finally {
      setActionUserId('');
    }
  }


  async function handleReject(
    userId
  ) {
    setActionUserId(
      userId
    );

    setApplicationError('');

    setApplicationSuccess('');


    try {
      await rejectProviderApplication(
        userId
      );


      setApplications(
        (
          currentApplications
        ) =>
          currentApplications.filter(
            (application) =>
              application._id !==
              userId
          )
      );


      setApplicationSuccess(
        'Provider application rejected successfully.'
      );
    } catch (error) {
      setApplicationError(
        error.response?.data
          ?.message ||
          'Could not reject this application.'
      );
    } finally {
      setActionUserId('');
    }
  }


  /*
   * ----------------------------------------------------------
   * RAFI FEATURE 3 - UPDATE ONE FORM FIELD
   * ----------------------------------------------------------
   *
   * Inputs temporarily store their values as strings because
   * browser number inputs also provide event.target.value as a
   * string.
   *
   * We convert them back to numbers before submitting.
   */
  function handleRewardSettingChange(
    fieldName,
    value
  ) {
    setRewardSettings(
      (currentSettings) => ({
        ...currentSettings,

        [fieldName]:
          value,
      })
    );
  }


  /*
   * ----------------------------------------------------------
   * RAFI FEATURE 3 - SAVE GLOBAL SETTINGS
   * ----------------------------------------------------------
   */
  async function handleRewardSettingsSubmit(
    event
  ) {
    event.preventDefault();


    if (
      isSavingRewardSettings
    ) {
      return;
    }


    setRewardSettingsError('');

    setRewardSettingsSuccess('');


    const payload = {
      premiumUpgradePrice:
        Number(
          rewardSettings.premiumUpgradePrice
        ),

      premiumBaseDiscountPercent:
        Number(
          rewardSettings.premiumBaseDiscountPercent
        ),

      pointsPerEligiblePayment:
        Number(
          rewardSettings.pointsPerEligiblePayment
        ),

      pointsPerDiscountStep:
        Number(
          rewardSettings.pointsPerDiscountStep
        ),

      discountPercentPerStep:
        Number(
          rewardSettings.discountPercentPerStep
        ),

      maximumDiscountPercent:
        Number(
          rewardSettings.maximumDiscountPercent
        ),
    };


    /*
     * Provide immediate browser-side feedback.
     *
     * The backend independently validates everything again.
     */
    if (
      Object.values(
        payload
      ).some(
        (value) =>
          !Number.isFinite(
            value
          )
      )
    ) {
      setRewardSettingsError(
        'Every Premium and reward setting must contain a valid number.'
      );

      return;
    }


    setIsSavingRewardSettings(
      true
    );


    try {
      const result =
        await updateRewardSettings(
          payload
        );


      const savedSettings =
        result?.data
          ?.settings;


      if (
        savedSettings
      ) {
        setRewardSettings({
          premiumUpgradePrice:
            savedSettings.premiumUpgradePrice,

          premiumBaseDiscountPercent:
            savedSettings.premiumBaseDiscountPercent,

          pointsPerEligiblePayment:
            savedSettings.pointsPerEligiblePayment,

          pointsPerDiscountStep:
            savedSettings.pointsPerDiscountStep,

          discountPercentPerStep:
            savedSettings.discountPercentPerStep,

          maximumDiscountPercent:
            savedSettings.maximumDiscountPercent,
        });
      }


      setRewardSettingsSuccess(
        'Premium and reward settings updated successfully.'
      );
    } catch (error) {
      setRewardSettingsError(
        error.response?.data
          ?.message ||
          'Could not update Premium and reward settings.'
      );
    } finally {
      setIsSavingRewardSettings(
        false
      );
    }
  }


  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* =====================================================
          PAGE HEADER
         ===================================================== */}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#0F6B4D]">
          Administration
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-slate-600">
          Manage provider applications and global Ghuraghuri Premium
          reward policy.
        </p>
      </div>


      {/* =====================================================
          RAFI FEATURE 3 - PREMIUM / REWARD SETTINGS
         ===================================================== */}
      <section className="rounded-2xl border border-[#DCE5E0] bg-white p-6 shadow-sm md:p-7">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#0F6B4D]">
            Rafi Feature 3
          </p>

          <h2 className="mt-2 text-2xl font-bold text-[#17211D]">
            Premium & Reward Settings
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#66756D]">
            These values are global. Updating them changes the current
            Premium policy for existing and future Premium travelers.
          </p>
        </div>


        {rewardSettingsError && (
          <div
            className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {
              rewardSettingsError
            }
          </div>
        )}


        {rewardSettingsSuccess && (
          <div
            className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            role="status"
          >
            {
              rewardSettingsSuccess
            }
          </div>
        )}


        {isLoadingRewardSettings ? (
          <div className="mt-6 rounded-xl border border-[#E1E8E4] bg-[#F8FBF9] p-6 text-center">
            <p className="text-sm text-[#66756D]">
              Loading Premium and reward settings...
            </p>
          </div>
        ) : (
          <form
            onSubmit={
              handleRewardSettingsSubmit
            }
            className="mt-6"
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <label className="block">
                <span className="text-sm font-semibold text-[#17211D]">
                  Premium Upgrade Price
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#66756D]">
                  One-time Premium activation price in BDT.
                </span>

                <input
                  type="number"
                  min="10"
                  step="1"
                  value={
                    rewardSettings.premiumUpgradePrice
                  }
                  onChange={(event) =>
                    handleRewardSettingChange(
                      'premiumUpgradePrice',
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm outline-none transition focus:border-[#0F6B4D]"
                />
              </label>


              <label className="block">
                <span className="text-sm font-semibold text-[#17211D]">
                  Premium Base Discount
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#66756D]">
                  Automatic percentage discount for Premium bookings.
                </span>

                <div className="relative mt-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={
                      rewardSettings.premiumBaseDiscountPercent
                    }
                    onChange={(event) =>
                      handleRewardSettingChange(
                        'premiumBaseDiscountPercent',
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-[#0F6B4D]"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#66756D]">
                    %
                  </span>
                </div>
              </label>


              <label className="block">
                <span className="text-sm font-semibold text-[#17211D]">
                  Points Per Successful Payment
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#66756D]">
                  Points earned after each eligible successful payment.
                </span>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    rewardSettings.pointsPerEligiblePayment
                  }
                  onChange={(event) =>
                    handleRewardSettingChange(
                      'pointsPerEligiblePayment',
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm outline-none transition focus:border-[#0F6B4D]"
                />
              </label>


              <label className="block">
                <span className="text-sm font-semibold text-[#17211D]">
                  Points Per Discount Step
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#66756D]">
                  Number of points required to unlock one reward step.
                </span>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    rewardSettings.pointsPerDiscountStep
                  }
                  onChange={(event) =>
                    handleRewardSettingChange(
                      'pointsPerDiscountStep',
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 text-sm outline-none transition focus:border-[#0F6B4D]"
                />
              </label>


              <label className="block">
                <span className="text-sm font-semibold text-[#17211D]">
                  Discount Per Reward Step
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#66756D]">
                  Extra percentage unlocked by each complete point block.
                </span>

                <div className="relative mt-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={
                      rewardSettings.discountPercentPerStep
                    }
                    onChange={(event) =>
                      handleRewardSettingChange(
                        'discountPercentPerStep',
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-[#0F6B4D]"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#66756D]">
                    %
                  </span>
                </div>
              </label>


              <label className="block">
                <span className="text-sm font-semibold text-[#17211D]">
                  Maximum Combined Discount
                </span>

                <span className="mt-1 block text-xs leading-5 text-[#66756D]">
                  Maximum Premium + reward discount allowed.
                </span>

                <div className="relative mt-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={
                      rewardSettings.maximumDiscountPercent
                    }
                    onChange={(event) =>
                      handleRewardSettingChange(
                        'maximumDiscountPercent',
                        event.target.value
                      )
                    }
                    className="w-full rounded-lg border border-[#D6DEDA] px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-[#0F6B4D]"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#66756D]">
                    %
                  </span>
                </div>
              </label>
            </div>


            <div className="mt-6 rounded-xl border border-[#DCE5E0] bg-[#F8FBF9] p-4">
              <p className="text-sm font-semibold text-[#17211D]">
                Current reward rule
              </p>

              <p className="mt-1 text-sm leading-6 text-[#66756D]">
                Every{' '}
                <span className="font-semibold text-[#17211D]">
                  {Number(
                    rewardSettings.pointsPerDiscountStep ||
                      0
                  ).toLocaleString()}
                </span>{' '}
                points can currently provide{' '}
                <span className="font-semibold text-[#0F6B4D]">
                  {Number(
                    rewardSettings.discountPercentPerStep ||
                      0
                  )}
                  %
                </span>{' '}
                additional booking discount.
              </p>
            </div>


            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={
                  isSavingRewardSettings
                }
                className="rounded-lg bg-[#08734F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#075D42] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSavingRewardSettings
                  ? 'Saving Settings...'
                  : 'Save Premium Settings'}
              </button>
            </div>
          </form>
        )}
      </section>


      {/* =====================================================
          EXISTING PROVIDER APPLICATION FEATURE
         ===================================================== */}
      <section className="mt-8">
        <div className="mb-5">
          <h2 className="text-2xl font-bold text-slate-900">
            Provider Applications
          </h2>

          <p className="mt-2 text-slate-600">
            Review pending hotel and guide accounts before they can use
            provider features.
          </p>
        </div>


        {applicationError && (
          <div
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {
              applicationError
            }
          </div>
        )}


        {applicationSuccess && (
          <div
            className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            role="status"
          >
            {
              applicationSuccess
            }
          </div>
        )}


        {isLoadingApplications ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-slate-600">
              Loading pending applications...
            </p>
          </div>
        ) : applications.length ===
          0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              No pending applications
            </h3>

            <p className="mt-2 text-sm text-slate-600">
              All hotel and guide applications have been reviewed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(
              (application) => {
                const isProcessing =
                  actionUserId ===
                  application._id;


                return (
                  <article
                    key={
                      application._id
                    }
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl font-semibold text-slate-900">
                            {
                              application.name
                            }
                          </h3>

                          <span className="rounded-full bg-[#E9F6F0] px-3 py-1 text-xs font-semibold capitalize text-[#075D42]">
                            {
                              application.role
                            }
                          </span>
                        </div>


                        <div className="mt-3 space-y-1 text-sm text-slate-600">
                          <p>
                            <span className="font-medium text-slate-800">
                              Email:
                            </span>{' '}
                            {
                              application.email
                            }
                          </p>

                          <p>
                            <span className="font-medium text-slate-800">
                              Phone:
                            </span>{' '}
                            {
                              application.phone
                            }
                          </p>

                          <p>
                            <span className="font-medium text-slate-800">
                              Status:
                            </span>{' '}

                            <span className="capitalize">
                              {
                                application.approvalStatus
                              }
                            </span>
                          </p>
                        </div>
                      </div>


                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            handleReject(
                              application._id
                            )
                          }
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Reject
                        </button>

                        <button
                          type="button"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            handleApprove(
                              application._id
                            )
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
              }
            )}
          </div>
        )}
      </section>
    </section>
  );
}


export default AdminDashboardPage;