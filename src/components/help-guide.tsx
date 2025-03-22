import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function HelpGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="mr-2 h-9 px-4"
        title="Help Guide"
      >
        <HelpCircle className="mr-2 h-4 w-4" />
        Guide
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="flex h-[600px] max-w-4xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-2xl">Help Guide</DialogTitle>
          </DialogHeader>

          <Tabs
            defaultValue="basics"
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="bg-background flex-shrink-0 pb-2">
              <TabsList className="grid h-10 w-full grid-cols-3">
                <TabsTrigger value="basics" className="text-sm">
                  Basics
                </TabsTrigger>
                <TabsTrigger value="advanced" className="text-sm">
                  Advanced
                </TabsTrigger>
                <TabsTrigger value="tips" className="text-sm">
                  Tips & Tricks
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <TabsContent value="basics" className="h-full">
                <div className="space-y-4 pb-8">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">
                      Creating Beats
                    </h3>
                    <ul className="list-disc space-y-2 pl-6">
                      <li>
                        Click on a pad to enable/disable a hit at that step
                      </li>
                      <li>
                        <strong>Right-click</strong> or{" "}
                        <strong>Cmd/Ctrl+Click</strong> on a pad to cycle
                        through velocity levels (High/Medium/Low)
                      </li>

                      <li>
                        Click the Play button or press
                        <span className="bg-secondary rounded p-1 font-mono">
                          Spacebar
                        </span>{" "}
                        to Start/Stop playback. You can continue to build your
                        pattern while playback is running.
                      </li>

                      <li>Adjust BPM to change the tempo of your beat</li>
                      <li>
                        Add swing to give your beat a more human, groovy feel.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-lg font-semibold">
                      Channel Controls
                    </h3>
                    <ul className="list-disc space-y-2 pl-6">
                      <li>
                        Click the circular channel name buttons to preview the
                        sound
                      </li>
                      <li>
                        Each channel has Mute (M) and Solo (S) buttons. Use them
                        to isolate what you want to hear.
                      </li>
                      <li>
                        Use the Pan knob to position sounds in the stereo field
                        (left/right)
                      </li>
                      <li>Adjust Volume to set the level of each channel</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-lg font-semibold">Samples</h3>
                    <ul className="list-disc space-y-2 pl-6">
                      <li>
                        Use the colored dots with left/right arrows to change
                        samples for each channel
                      </li>
                      <li>
                        Click the sample name to see a list of all available
                        sounds for that channel
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="h-full">
                <div className="space-y-4 pb-8">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold">Effects</h3>
                    <ul className="list-disc space-y-2 pl-6">
                      <li>
                        <strong>Double-click</strong> or{" "}
                        <strong>Right-click</strong> on any knob to reset it to
                        its default value
                      </li>
                      <li>
                        Each channel has high-pass (HP) and low-pass (LP)
                        filters to shape the sound
                      </li>
                      <li>
                        Adjust Delay to add echo effects. Click the gear icon
                        for advanced delay settings
                      </li>
                      <li>Use Reverb to add space and ambience</li>
                      <li>
                        Click "Global Effects" to adjust master reverb and
                        compression settings.
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-lg font-semibold">
                      Pattern Chain
                    </h3>
                    <ul className="list-disc space-y-2 pl-6">
                      <li>Toggle "Chain" to enable pattern sequencing</li>
                      <li>
                        Select the number of patterns in your sequence with
                        "Length"
                      </li>
                      <li>
                        Choose which patterns (A, B, C, D) play in which order
                      </li>
                      <li>
                        The current playing pattern is highlighted when Chain is
                        enabled
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-lg font-semibold">
                      Patterns & Storage
                    </h3>
                    <ul className="list-disc space-y-2 pl-6">
                      <li>
                        Try the Shift Left/Right buttons to move your entire
                        pattern by one step
                      </li>
                      <li>
                        Use patterns A, B, C, and D to create different parts of
                        your song
                      </li>
                      <li>Use Copy/Paste to duplicate patterns</li>
                      <li>Save your work with the Save button</li>
                      <li>
                        Export your pattern as a MIDI file for use in other
                        music software
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tips" className="h-full">
                <div className="space-y-4 pb-8">
                  <div>
                    <ul className="list-disc space-y-2 pl-6">
                      <li>
                        Build your pattern from the bottom to the top (e.g.
                        start with the kick)
                      </li>

                      <li>
                        Don't ignore Swing! Lower values will feel like techno,
                        moderate values like house, extreme values like hip-hop.
                        Higher swing values pair well with lower BPMs.
                      </li>

                      <li>
                        Don't ignore Velocity! Velocity is how "hard" the pad is
                        it. The default value is the "hardest". Lower values
                        will be softer. Varied velocity hits give a pattern
                        nuance and contribute to the groove.
                      </li>

                      <li>
                        After you get a sense of what each channel sounds like,
                        you probably want to disable "Preview".
                      </li>
                      <li>
                        Once you get a basic pattern you like, copy/paste it
                        into the other pattern holders so you can start adding
                        little variations.
                      </li>
                      <li>
                        If a particular sound is fatiguing, use the low-pass
                        filter to take the edge off. Or just turn down the
                        volume on that channel.
                      </li>
                      <li>
                        Only apply reverb very sparingly to kicks (otherwise it
                        will sound muddy). You can be more generous with other
                        instruments.
                      </li>
                    </ul>
                  </div>
                </div>
              </TabsContent>
            </div>

            <div className="text-muted-foreground mt-4 pb-2 text-center text-sm">
              Press ESC or click outside this window to close
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}
