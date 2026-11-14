import { useMachineNotifications } from "@/skin/notifications/use-machine-notifications"
import { useExtensions } from "@/skin/use-extensions"
import { ExtensionsPage } from "@/skin/extensions"
import { useAdvanced } from "@/skin/use-advanced"
import { AdvancedPage } from "@/skin/advanced"
import { useRecipeEditor } from "@/skin/use-recipe-editor"
import { ProfileEditor, ProfileEditorActions } from "@/skin/profile-editor"
import { useCatalog } from "@/skin/use-catalog"
import { InventoryPage, RecipePreferences } from "@/skin/inventory"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import { DecaidGateway, gatewayUrl } from "@/gateway/client"
import { DailySettingsPage } from "@/skin/daily-settings"
import { useDailySettings } from "@/skin/use-daily-settings"
import { settingsCategories } from "@/skin/pages"
import type { SettingsCategory } from "@/gateway/daily-settings"
import { CandidateHeader } from "@/skin/brewing/header"
import { LiveBrewingScreen } from "@/skin/brewing/live-view"
import { useLiveBrewing } from "@/skin/brewing/live-session"
import { ProfileDetail, ProfileLibrary } from "@/skin/profile-library"
import { GrindEditor } from "@/skin/grind-editor"
import { HistoryPage, ShotDetail, ShotActions } from "@/skin/history"
import { useShotHistory } from "@/skin/use-shot-history"
import { useSkin } from "@/skin/use-skin"
import { useProfileTransfer } from "@/skin/use-profile-transfer"
import { useFavorites } from "@/skin/use-favorites"
import { useNavigation, type Route } from "@/skin/navigation"
import {
  ConfirmNavigation,
  FavoritesPage,
  PageShell,
  SettingsPage,
} from "@/skin/pages"
import { Action } from "@/skin/primitives"
import "@/skin/skin.css"
import "@/skin/brewing/brewing.css"

export default function App() {
  const [gateway] = useState(() => new DecaidGateway(gatewayUrl()))
  const s = useSkin(gateway)
  useMachineNotifications(s)
  const advanced = useAdvanced(gateway)
  const extensions = useExtensions(gateway)
  const history = useShotHistory(gateway)
  const daily = useDailySettings(gateway)
  const recipes = useRecipeEditor(gateway)
  const catalog = useCatalog(gateway)
  const editor = useFavorites(gateway, s.snapshot)
  const transfer = useProfileTransfer(gateway, s.reloadLibrary)
  const saving =
    !!extensions.busy ||
    !!advanced.busy ||
    history.busy ||
    recipes.busy ||
    catalog.busy ||
    editor.saving ||
    transfer.operation === "import" ||
    daily.saving ||
    s.snapshot.pending
  const nav = useNavigation(
    extensions.dirty ||
      advanced.dirty ||
      history.dirty ||
      editor.dirty ||
      daily.dirty ||
      recipes.dirty ||
      catalog.dirty ||
      catalog.preferenceDirty ||
      saving ||
      transfer.selection !== null,
    (route) => {
      if (route.page === "shot" && history.record?.id === route.id)
        history.cancel()
      if (route.page === "edit") recipes.cancel()
      if (route.page === "inventory") catalog.cancelInventory()
      if (route.page === "recipe") catalog.cancelPreference()
      if (route.page === "settings") {
        daily.cancel()
        advanced.clear()
        extensions.clear()
      }
      if (route.page === "favorites" || route.page === "library") {
        editor.cancel()
        transfer.cancel()
      }
    },
    (route) =>
      route.page === "shot"
        ? (history.record?.id === route.id && history.dirty) || history.busy
        : route.page === "edit"
          ? recipes.dirty || recipes.busy
          : route.page === "inventory"
            ? catalog.dirty || catalog.busy
            : route.page === "recipe"
              ? catalog.preferenceDirty || catalog.busy
              : route.page === "settings"
                ? extensions.dirty ||
                  !!extensions.busy ||
                  daily.dirty ||
                  daily.saving ||
                  advanced.dirty ||
                  !!advanced.busy
                : route.page === "favorites"
                  ? editor.dirty || editor.saving
                  : route.page === "library"
                    ? transfer.selection !== null ||
                      transfer.operation === "import" ||
                      (route.slot !== undefined && editor.dirty)
                    : false
  )
  const brewing = useLiveBrewing(
    s.snapshot,
    s.machineFresh,
    nav.route.page === "home"
  )
  const openHistory = useEffectEvent(() => {
    if (nav.route.page === "history" && !history.loaded) void history.list()
    if (nav.route.page === "shot" && nav.route.id)
      void history.open(nav.route.id)
  })
  useEffect(() => {
    openHistory()
  }, [nav.route.page, nav.route.id])
  const openPage = useEffectEvent(() => {
    const record = s.snapshot.profiles.find((p) => p.id === nav.route.id)
    if (nav.route.page === "edit" && (!nav.route.id || record))
      recipes.open(record ?? null)
    else if (nav.route.page === "edit" && !recipes.draft) void recipes.recover()
    if (nav.route.page === "recipe" && record)
      void catalog.openPreference(record)
    if (nav.route.page === "inventory" && !catalog.data) void catalog.refresh()
  })
  const initializedPage = useRef("")
  useEffect(() => {
    const key = `${nav.route.page}:${nav.route.id ?? "new"}`
    if (
      initializedPage.current === key &&
      !(
        nav.route.page === "edit" &&
        !recipes.draft &&
        !recipes.busy &&
        s.snapshot.profiles.some((p) => p.id === nav.route.id)
      )
    )
      return
    if (
      ["edit", "recipe"].includes(nav.route.page) &&
      nav.route.id &&
      !s.snapshot.profiles.some((p) => p.id === nav.route.id) &&
      (s.libraryLoading || nav.route.page === "recipe")
    )
      return
    initializedPage.current = key
    openPage()
  }, [
    nav.route.page,
    nav.route.id,
    s.snapshot.profiles,
    s.libraryLoading,
    recipes.draft,
    recipes.busy,
  ])
  const syncEditorRoute = useEffectEvent(() => {
    if (
      nav.route.page === "edit" &&
      recipes.source &&
      !recipes.pending &&
      recipes.source.id !== nav.route.id
    )
      nav.navigate({ page: "edit", id: recipes.source.id }, true)
  })
  useEffect(() => {
    syncEditorRoute()
  }, [recipes.source, recipes.pending])
  const assignment =
    nav.route.page === "library" ? (nav.route.slot ?? null) : null
  const observedShot = useRef(0)
  const focusShot = useRef<number | null>(null)
  const onShot = useEffectEvent(() => {
    focusShot.current = gateway.getSnapshot().shotSequence
    nav.interrupt()
    s.setModal(null)
    s.setSettings(null)
  })
  useEffect(
    () =>
      gateway.subscribe(() => {
        const next = gateway.getSnapshot().observedShot
        if (next === observedShot.current) return
        observedShot.current = next
        onShot()
      }),
    [gateway]
  )
  useEffect(() => {
    if (
      focusShot.current !== brewing.state.sequence ||
      nav.route.page !== "home" ||
      brewing.state.route !== "home" ||
      ["home", "returning"].includes(brewing.state.phase)
    )
      return
    document
      .querySelector<HTMLElement>(".brew-title")
      ?.focus({ preventScroll: true })
    focusShot.current = null
  }, [
    nav.route.page,
    brewing.state.sequence,
    brewing.state.route,
    brewing.state.phase,
  ])
  const previousPage = useRef(nav.route.page)
  useEffect(() => {
    if (nav.route.page === "home" && previousPage.current !== "home") {
      const label = s.active
        ? "Machine state"
        : ["history", "shot"].includes(previousPage.current)
          ? "History"
          : previousPage.current === "settings"
            ? "Settings"
            : "All profiles"
      document.querySelector<HTMLElement>(`[aria-label="${label}"]`)?.focus()
    }
    previousPage.current = nav.route.page
  }, [nav.route.page, s.active])
  function navigate(route: Route) {
    if (
      route.page === "home" &&
      gateway.getSnapshot().machine?.state.state === "espresso"
    )
      nav.interrupt()
    else nav.navigate(route)
  }
  function assign(slot: number) {
    nav.navigate({ page: "library", slot }, true)
  }
  const page = nav.route.page
  const title =
    page === "history"
      ? "Shot history"
      : page === "shot"
        ? "Shot details"
        : page === "edit"
          ? "Profile editor"
          : page === "recipe"
            ? "Recipe preferences"
            : page === "inventory"
              ? "Coffee and equipment"
              : page === "settings"
                ? (settingsCategories.find((c) => c.id === nav.route.category)
                    ?.title ?? "Settings")
                : page === "favorites"
                  ? "Manage favorites"
                  : page === "profile"
                    ? (s.allProfiles.find((p) => p.id === nav.route.id)?.name ??
                      "Profile details")
                    : assignment === null
                      ? "Profile library"
                      : `Choose favorite ${assignment + 1}`
  function browse() {
    navigate({ page: "library" })
  }

  useEffect(() => {
    const keyboard = () => {
      document.documentElement.dataset.input = "keyboard"
    }
    const pointer = () => {
      document.documentElement.dataset.input = "pointer"
    }
    window.addEventListener("keydown", keyboard)
    window.addEventListener("pointerdown", pointer)
    return () => {
      window.removeEventListener("keydown", keyboard)
      window.removeEventListener("pointerdown", pointer)
    }
  }, [])
  const activity = useRef(0)
  const onActivity = useEffectEvent((event: Event) => {
    if (
      !event.isTrusted ||
      !s.snapshot.presenceEnabled ||
      document.hidden ||
      s.snapshot.connection !== "online" ||
      s.snapshot.machine?.state.state !== "idle" ||
      !s.snapshot.settings ||
      !["tracking", "disabled"].includes(s.snapshot.settings.gatewayMode)
    )
      return
    if (Date.now() - activity.current < 30000) return
    activity.current = Date.now()
    void gateway.request("/api/v1/machine/heartbeat", "POST").catch(() => {
      /* Presence failure must not interrupt Stop or replay activity. */
    })
  })
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      !s.snapshot.preferences?.keyboardShortcuts ||
      event.repeat ||
      (event.target instanceof HTMLElement &&
        (event.target.closest("input,textarea,select,[role=combobox],dialog") ||
          event.target.isContentEditable))
    )
      return
    if (event.altKey && event.key.toLowerCase() === "h") {
      event.preventDefault()
      navigate({ page: "home" })
    }
    if (event.altKey && event.key.toLowerCase() === "s") {
      event.preventDefault()
      navigate({ page: "settings" })
    }
  })
  useEffect(() => {
    const activity = (event: Event) => onActivity(event)
    const shortcut = (event: KeyboardEvent) => onShortcut(event)
    document.addEventListener("pointerdown", activity)
    document.addEventListener("keydown", activity)
    document.addEventListener("keydown", shortcut)
    return () => {
      document.removeEventListener("pointerdown", activity)
      document.removeEventListener("keydown", activity)
      document.removeEventListener("keydown", shortcut)
    }
  }, [])
  return (
    <div className="skin-viewport focus-app">
      {!(page === "home" && s.snapshot.machine?.state.state === "sleeping") && (
        <CandidateHeader
          s={s}
          tankCalibration={
            s.snapshot.refillKit === true ? null : "standard-de1"
          }
          onConnections={() =>
            navigate({ page: "settings", category: "connections" })
          }
          onHistory={() => navigate({ page: "history" })}
          onSettings={() => navigate({ page: "settings" })}
        />
      )}
      <div
        className="focus-app-content"
        data-home={
          page === "home" && s.snapshot.machine?.state.state !== "sleeping"
        }
      >
        {page === "home" && s.snapshot.machine?.state.state === "sleeping" ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 bg-background">
            <h1 className="text-[30px] font-medium tracking-[-.045em]">
              Sleeping
            </h1>
            <p className="text-sm text-muted-foreground">
              The machine is resting.
            </p>
            <Action
              disabled={s.snapshot.pending || !s.connected}
              onClick={() => void s.perform(() => gateway.daily.power(false))}
            >
              Wake machine
            </Action>
            <Action
              variant="outline"
              onClick={() =>
                navigate({ page: "settings", category: "machine" })
              }
            >
              Machine settings
            </Action>
          </div>
        ) : page === "home" ? (
          <LiveBrewingScreen
            embedded
            home={s}
            onConnections={() =>
              navigate({ page: "settings", category: "connections" })
            }
            state={brewing.state}
            dispatch={brewing.dispatch}
            tankCalibration={
              s.snapshot.refillKit === true ? null : "standard-de1"
            }
            onHistory={() => navigate({ page: "history" })}
            onSettings={() => navigate({ page: "settings" })}
            onEdit={() => navigate({ page: "edit", id: s.selectedId })}
            onBrowse={browse}
            onAssign={assign}
          />
        ) : (
          <PageShell
            route={nav.route}
            navigate={navigate}
            title={title}
            description={
              page === "settings" &&
              (editor.dirty || daily.dirty || transfer.selection)
                ? "Your unsaved changes are retained. Return to their settings section, Manage favorites or Profile library to continue."
                : page === "favorites"
                  ? "Five stable positions on Home. Replace, reorder or leave a position empty."
                  : page === "library" && assignment !== null
                    ? "Choose a visible profile. An existing favorite swaps positions; Save applies your changes."
                    : undefined
            }
            actions={
              page === "shot" ? (
                history.record?.id === nav.route.id ? (
                  <ShotActions history={history} />
                ) : null
              ) : page === "edit" ? (
                <ProfileEditorActions editor={recipes} />
              ) : page === "favorites" ? (
                <>
                  <Action
                    variant="outline"
                    disabled={editor.saving}
                    onClick={editor.cancel}
                  >
                    Cancel changes
                  </Action>
                  <Action
                    disabled={
                      editor.saving ||
                      s.libraryLoading ||
                      (!s.snapshot.favoritesLoaded &&
                        !s.snapshot.favoritesIssue)
                    }
                    onClick={editor.save}
                  >
                    {editor.saving ? "Saving…" : "Save favorites"}
                  </Action>
                </>
              ) : page === "library" && assignment !== null ? (
                <Action
                  variant="outline"
                  onClick={() => {
                    nav.navigate({ page: "favorites" }, true)
                  }}
                >
                  Cancel assignment
                </Action>
              ) : undefined
            }
          >
            {page === "settings" && (
              <>
                <SettingsPage
                  category={nav.route.category}
                  navigate={navigate}
                />
                {["extensions", "help"].includes(nav.route.category ?? "") && (
                  <ExtensionsPage
                    key={`extensions:${nav.route.category}`}
                    s={s}
                    h={extensions}
                    route={nav.route}
                    navigate={navigate}
                  />
                )}
                {["calibration", "maintenance", "updates", "machine"].includes(
                  nav.route.category ?? ""
                ) && (
                  <AdvancedPage
                    key={`advanced:${nav.route.category}`}
                    category={nav.route.category!}
                    s={s}
                    h={advanced}
                    navigate={navigate}
                  />
                )}
                {["connections", "brew", "machine", "display"].includes(
                  nav.route.category ?? ""
                ) && (
                  <DailySettingsPage
                    key={`daily:${nav.route.category}`}
                    category={nav.route.category as SettingsCategory}
                    s={s}
                    editor={daily}
                  />
                )}
              </>
            )}
            {page === "favorites" && (
              <FavoritesPage s={s} editor={editor} assign={assign} />
            )}
            {page === "library" && (
              <ProfileLibrary
                s={s}
                navigate={navigate}
                assignment={assignment}
                transfer={transfer}
                onAssign={(id) => {
                  if (assignment !== null) editor.assign(assignment, id)
                  nav.navigate({ page: "favorites" }, true)
                }}
              />
            )}
            {page === "history" && (
              <HistoryPage history={history} navigate={navigate} />
            )}
            {page === "shot" && (
              <ShotDetail
                key={nav.route.id}
                s={s}
                history={history}
                id={nav.route.id}
                navigate={navigate}
              />
            )}
            {page === "edit" && <ProfileEditor s={s} editor={recipes} />}
            {page === "recipe" && <RecipePreferences catalog={catalog} />}
            {page === "inventory" && <InventoryPage s={s} catalog={catalog} />}
            {page === "profile" && (
              <ProfileDetail
                key={nav.route.id}
                s={s}
                id={nav.route.id}
                navigate={navigate}
              />
            )}
          </PageShell>
        )}
      </div>
      {nav.pending && (
        <ConfirmNavigation
          stay={nav.stay}
          leave={nav.leave}
          saving={saving}
          activeOperation={s.active ? "Espresso" : s.operation}
        />
      )}
      {s.modal === "grind" && <GrindEditor s={s} />}
    </div>
  )
}
