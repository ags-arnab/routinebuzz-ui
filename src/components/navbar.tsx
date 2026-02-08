import { useEffect, useState } from "react";
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
} from "@heroui/navbar";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Button } from "@heroui/button";
import { Switch } from "@heroui/switch";
import { Chip } from "@heroui/chip";
import { useDisclosure } from "@heroui/modal";
import {
  HelpCircle,
  ChevronDown,
  ExternalLink,
  Sparkles,
  Share2,
  Trash2,
  Smartphone,
  Monitor,
  Apple,
  CalendarPlus,
  GitFork,
} from "lucide-react";

import { ThemeSwitch } from "@/components/theme-switch";
import { useRoutine } from "@/contexts/routine-context";

export const Navbar = () => {
  const {
    isOpen: isHelpOpen,
    onOpen: onHelpOpen,
    onClose: onHelpClose,
  } = useDisclosure();
  const {
    isOpen: isFeatureIntroOpen,
    onOpen: onFeatureIntroOpen,
    onClose: onFeatureIntroClose,
  } = useDisclosure();
  const {
    isRoutineMode,
    toggleRoutineMode,
    routineCourses,
    showRoutineFeatureIntro,
    markRoutineFeatureIntroShown,
  } = useRoutine();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (showRoutineFeatureIntro) {
      onFeatureIntroOpen();
    }
  }, [showRoutineFeatureIntro, onFeatureIntroOpen]);

  const handleFeatureIntroClose = () => {
    markRoutineFeatureIntroShown();
    onFeatureIntroClose();
  };

  return (
    <>
      <HeroUINavbar
        isBordered
        classNames={{
          base: "bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]",
          wrapper: "px-4",
        }}
        isMenuOpen={isMenuOpen}
        maxWidth="xl"
        position="sticky"
        onMenuOpenChange={setIsMenuOpen}
      >
        <NavbarContent className="sm:hidden" justify="start">
          <NavbarMenuToggle
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          />
        </NavbarContent>

        <NavbarContent className="sm:hidden pr-3" justify="center">
          <NavbarBrand className="flex items-center gap-1.5">
            <img alt="RoutineBuzz" className="h-5 w-5" src="/logo.svg" />
            <p className="font-bold text-lg text-foreground">routinebuzz</p>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent className="hidden sm:flex" justify="start">
          <NavbarItem className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Switch
                color="primary"
                isSelected={isRoutineMode}
                size="sm"
                thumbIcon={isRoutineMode ? <Sparkles size={12} /> : undefined}
                onValueChange={toggleRoutineMode}
              />
              <span
                className={`text-sm font-medium ${isRoutineMode ? "text-primary" : "text-default-500"}`}
              >
                Routine Mode
              </span>
              {isRoutineMode && routineCourses.length > 0 && (
                <Chip color="primary" size="sm" variant="flat">
                  {routineCourses.length}
                </Chip>
              )}
            </div>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent className="hidden sm:flex" justify="center">
          <NavbarBrand className="flex items-center gap-2">
            <img alt="RoutineBuzz" className="h-6 w-6" src="/logo.svg" />
            <p className="font-bold text-xl text-foreground">routinebuzz</p>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent className="hidden sm:flex" justify="end">
          <NavbarItem className="flex items-center gap-2">
            <ThemeSwitch />
            <Dropdown>
              <DropdownTrigger>
                <Button
                  className="text-default-500"
                  endContent={<ChevronDown size={14} />}
                  size="sm"
                  variant="light"
                >
                  Other Tools
                </Button>
              </DropdownTrigger>
              <DropdownMenu aria-label="Other Tools">
                <DropdownItem
                  key="free-lab-finder"
                  startContent={<ExternalLink size={16} />}
                  onPress={() =>
                    window.open("https://bracu-lab-buddy.pages.dev", "_blank")
                  }
                >
                  Free Lab Finder
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
            <Button
              isIconOnly
              aria-label="Help"
              size="sm"
              variant="light"
              onPress={onHelpOpen}
            >
              <HelpCircle className="text-default-500" size={18} />
            </Button>
          </NavbarItem>
        </NavbarContent>

        <NavbarContent className="sm:hidden" justify="end">
          <NavbarItem className="flex items-center gap-1">
            <Button
              className={`min-w-0 px-2 gap-1 ${isRoutineMode ? "" : "text-default-500"}`}
              color={isRoutineMode ? "primary" : "default"}
              size="sm"
              startContent={
                <Sparkles
                  className={
                    isRoutineMode ? "text-primary" : "text-default-400"
                  }
                  size={14}
                />
              }
              variant={isRoutineMode ? "flat" : "light"}
              onPress={toggleRoutineMode}
            >
              <span className="text-xs font-medium">
                {isRoutineMode ? "On" : "Off"}
              </span>
              {isRoutineMode && routineCourses.length > 0 && (
                <Chip
                  className="h-4 min-w-4 px-1 text-[10px]"
                  color="primary"
                  size="sm"
                  variant="solid"
                >
                  {routineCourses.length}
                </Chip>
              )}
            </Button>
          </NavbarItem>
          <ThemeSwitch />
        </NavbarContent>

        <NavbarMenu className="pt-6 pb-[env(safe-area-inset-bottom)]">
          <NavbarMenuItem className="py-3 border-b border-divider">
            <Button
              className="w-full justify-start"
              startContent={<ExternalLink size={18} />}
              variant="light"
              onPress={() => {
                window.open("https://bracu-lab-buddy.pages.dev", "_blank");
                setIsMenuOpen(false);
              }}
            >
              Free Lab Finder
            </Button>
          </NavbarMenuItem>

          <NavbarMenuItem className="py-3">
            <Button
              className="w-full justify-start"
              startContent={<HelpCircle size={18} />}
              variant="light"
              onPress={() => {
                onHelpOpen();
                setIsMenuOpen(false);
              }}
            >
              Help & Guide
            </Button>
          </NavbarMenuItem>
        </NavbarMenu>
      </HeroUINavbar>

      <Modal
        backdrop="blur"
        isOpen={isHelpOpen}
        scrollBehavior="inside"
        size="2xl"
        onClose={onHelpClose}
      >
        <ModalContent>
          {(onClose: () => void) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h3 className="text-lg font-bold">Course Information Guide</h3>
              </ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2 bg-gradient-to-br from-default-100 to-default-50 p-4 rounded-2xl">
                    <p className="text-sm text-default-600 mb-3">
                      Each course entry follows this format:
                    </p>
                    <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl text-center">
                      <p className="font-bold mb-2">
                        Section - Faculty - Available Seats
                      </p>
                      <span className="font-mono bg-success/20 px-3 py-1.5 rounded-lg text-success-600 text-lg">
                        18-TBA-(20)
                      </span>
                    </div>
                  </div>

                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm shrink-0">
                        S
                      </div>
                      <span className="font-semibold text-primary">
                        Section
                      </span>
                    </div>
                    <p className="text-sm text-default-600">
                      The section number (e.g., 18)
                    </p>
                  </div>

                  <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary/20 text-secondary font-bold text-sm shrink-0">
                        F
                      </div>
                      <span className="font-semibold text-secondary">
                        Faculty
                      </span>
                    </div>
                    <p className="text-sm text-default-600">
                      Faculty initials or "TBA"
                    </p>
                  </div>

                  <div className="bg-success/5 p-4 rounded-2xl border border-success/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Chip color="success" size="sm" variant="flat">
                        Available
                      </Chip>
                    </div>
                    <p className="text-sm text-default-600">
                      Green = seats available
                    </p>
                  </div>

                  <div className="bg-danger/5 p-4 rounded-2xl border border-danger/10">
                    <div className="flex items-center gap-2 mb-2">
                      <Chip color="danger" size="sm" variant="flat">
                        Full
                      </Chip>
                    </div>
                    <p className="text-sm text-default-600">
                      Red = section is full
                    </p>
                  </div>

                  <div className="md:col-span-2 bg-gradient-to-r from-primary/10 to-secondary/10 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="text-primary" size={20} />
                      <h4 className="text-base font-bold text-primary">
                        Routine Builder Mode
                      </h4>
                    </div>
                    <p className="text-sm text-default-600">
                      Build and share your perfect class schedule!
                    </p>
                  </div>

                  <div className="bg-default-100 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">
                        1
                      </div>
                      <span className="font-semibold">Enable Mode</span>
                    </div>
                    <p className="text-xs text-default-500">
                      Toggle the switch in the navbar
                    </p>
                  </div>

                  <div className="bg-default-100 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">
                        2
                      </div>
                      <span className="font-semibold">Add Courses</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Monitor className="text-default-400" size={14} />
                        <p className="text-xs text-default-500">
                          <kbd className="px-1 py-0.5 bg-default-200 rounded text-xs">
                            Ctrl+Alt
                          </kbd>{" "}
                          + Click
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Apple className="text-default-400" size={14} />
                        <p className="text-xs text-default-500">
                          <kbd className="px-1 py-0.5 bg-default-200 rounded text-xs">
                            ⌘ Cmd
                          </kbd>{" "}
                          + Click
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="text-default-400" size={14} />
                        <p className="text-xs text-default-500">
                          Long press on chip
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-default-100 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">
                        3
                      </div>
                      <span className="font-semibold">Remove</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trash2 className="text-danger" size={14} />
                      <p className="text-xs text-default-500">
                        Click course in routine
                      </p>
                    </div>
                  </div>

                  <div className="bg-default-100 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white font-bold text-sm shrink-0">
                        4
                      </div>
                      <span className="font-semibold">Share</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Share2 className="text-success" size={14} />
                      <p className="text-xs text-default-500">
                        Get shareable link
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-success/10 p-3 rounded-xl">
                    <p className="text-sm text-success-700 text-center">
                      <span className="font-medium">Auto-saved!</span> Your
                      routine persists across sessions.
                    </p>
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="primary" onPress={onClose}>
                  Got it!
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <Modal
        backdrop="blur"
        isDismissable={false}
        isOpen={isFeatureIntroOpen}
        size="md"
        onClose={handleFeatureIntroClose}
      >
        <ModalContent>
          <>
            <ModalHeader className="flex flex-col gap-1 pb-0">
              <div className="flex items-center gap-2">
                <Sparkles className="text-primary" size={24} />
                <h3 className="text-xl font-bold">
                  Welcome to RoutineBuzz!
                </h3>
              </div>
            </ModalHeader>
            <ModalBody className="pt-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-primary-50 rounded-xl">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-default-700">
                      Build Your Routine
                    </p>
                    <p className="text-sm text-default-500">
                      Enable routine mode, then{" "}
                      <kbd className="px-1 py-0.5 bg-default-200 rounded text-xs">
                        Ctrl+Alt
                      </kbd>
                      /
                      <kbd className="px-1 py-0.5 bg-default-200 rounded text-xs">
                        ⌘
                      </kbd>{" "}
                      + Click to add courses
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-secondary-50 rounded-xl">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-white shrink-0">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-default-700">
                      Share & Collaborate
                    </p>
                    <p className="text-sm text-default-500">
                      Share a link with friends — viewers see your changes in realtime
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-warning-50 rounded-xl">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-warning text-white shrink-0">
                    <GitFork size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-default-700">
                      Fork & Customize
                    </p>
                    <p className="text-sm text-default-500">
                      Viewers can fork a shared routine to make their own version
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-success-50 rounded-xl">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-success text-white shrink-0">
                    <CalendarPlus size={16} />
                  </div>
                  <div>
                    <p className="font-medium text-default-700">
                      Export to Calendar
                    </p>
                    <p className="text-sm text-default-500">
                      Download a .ics file with classes, labs, exams, and reminders
                    </p>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                className="w-full"
                color="primary"
                onPress={handleFeatureIntroClose}
              >
                Got it, let's go!
              </Button>
            </ModalFooter>
          </>
        </ModalContent>
      </Modal>
    </>
  );
};
