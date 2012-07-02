---
layout: default
---

<h2 id="intro">Introduction</h2>

In this tiny ebook I'm going to show you how to get started writing 6502
assembly language. The 6502 processor was massive in the seventies and
eighties, powering famous computers like the
[BBC Micro](http://en.wikipedia.org/wiki/BBC_Micro),
[Atari 2600](http://en.wikipedia.org/wiki/Atari_2600),
[Commodore 64](http://en.wikipedia.org/wiki/Commodore_64), and the [Nintendo Entertainment
System](http://en.wikipedia.org/wiki/Nintendo_Entertainment_System). Bender in
Futurama [has a 6502 processor for a
brain](http://www.transbyte.org/SID/SID-files/Bender_6502.jpg). [Even the
Terminator was programmed in
6502](http://www.pagetable.com/docs/terminator/00-37-23.jpg).

So, why would you want to learn 6502? It's a dead language isn't it? Well,
yeah, but so's Latin. And they still teach that.
[Q.E.D.](http://en.wikipedia.org/wiki/Q.E.D.)

Seriously though, I think it's valuable to have an understanding of assembly
language. Assembly language is the lowest level of abstraction in computers -
the point at which the code is still readable. Assembly language translates
directly to the bytes that are executed by your computer's processor.
If you understand how it works, you've basically become a computer
[magician](http://skilldrick.co.uk/2011/04/magic-in-software-development/).

Then why 6502? Why not a *useful* assembly language, like
[x86](http://en.wikipedia.org/wiki/X86)? Well, I don't think learning x86 is
useful. I don't think you'll ever have to *write* assembly language in your day
job - this is purely an academic exercise, something to expand your mind and
your thinking. 6502 was written in a different age, a time when the majority of
developers were writing assembly directly, rather than in these new-fangled
high-level programming languages. So, it was designed to be written by humans.
More modern assembly languages are meant to written by compilers, so let's
leave it to them. Plus, 6502 is *fun*. Nobody ever called x86 *fun*.


<h2 id="first-program">Our first program</h2>

So, let's dive in! That thing below is a little [JavaScript 6502 compiler and
emulator](https://github.com/skilldrick/6502js) that I adapted for this book.
Click **Compile** then **Run** to compile and run the snippet of assembly language.

{% include start.html %}
LDA #$01
STA $0200
LDA #$05
STA $0201
LDA #$08
STA $0202
{% include end.html %}

Hopefully the black area on the right now has three coloured "pixels" at the
top left. (If this doesn't work, you'll probably need to upgrade your browser to
something more modern, like Chrome or Firefox.)

So, what's this program actually doing? Let's step through it with the
debugger. Hit **Reset**, then check the **Debugger** checkbox to start the
debugger. Click **Step** once. If you were watching carefully, you'll have
noticed that `A=` changed from `$00` to `$01`, and `PC=` changed from `$0600` to
`$0602`.

Any numbers prefixed with `$` in 6502 assembly language (and by extension, in
this book) are in hexadecimal (hex) format. If you're not familiar with hex
numbers, I recommend you read [the Wikipedia
article](http://en.wikipedia.org/wiki/Hexadecimal). Anything prefixed with `#`
is a literal number value. Any other number refers to a memory location.

Equipped with that knowledge, you should be able to see that the instruction
`LDA #$01` loads the hex value `$01` into register `A`. I'll go into more
detail on registers in the next section.

Press **Step** again to execute the second instruction. The top-left pixel of
the simulator display should now be white. This simulator uses the memory
locations `$0200` to `$05ff` to draw pixels on its display. The values `$00` to
`$0f` represent 16 different colours (`$00` is black and `$01` is white), so
storing the value `$01` at memory location `$0200` draws a white pixel at the
top left corner. This is simpler than how an actual computer would output
video, but it'll do for now.

So, the instruction `STA $0200` stores the value of the `A` register to memory
location `$0200`. Click **Step** four more times to execute the rest of the
instructions, keeping an eye on the `A` register as it changes.

###Exercises###

1. Try changing the colour of the three pixels.
2. Change one of the pixels to draw at the bottom-right corner (memory location `$05ff`).
3. Add more instructions to draw extra pixels.


<h2 id='registers'>Registers and flags</h2>

We've already had a little look at the processor status section (the bit with
`A`, `PC` etc.), but what does it all mean?

The first line shows the `A`, `X` and `Y` registers (`A` is often called the
"accumulator"). Each register holds a single byte. Most operations work on the
contents of these registers.

`SP` is the stack pointer. I won't get into the stack yet, but basically this
register is decremented every time a byte is pushed onto the stack, and
incremented when a byte is popped off the stack.

`PC` is the program counter - it's how the processor knows at what point in the
program it currently is. It's like the current line number of an executing
script. In the JavaScript simulator the code is compiled starting at memory
location `$0600`, so `PC` always starts there.

The last section shows the processor flags. Each flag is one bit, so all seven
flags live in a single byte. The flags are set by the processor to give
information about the previous instruction. More on that later. [Read more
about the registers and flags here](http://www.obelisk.demon.co.uk/6502/registers.html).


<h2 id='instructions'>Instructions</h2>

Instructions in assembly language are like a small set of predefined functions.
All instructions take zero or one arguments. Here's some annotated
source code to introduce a few different instructions:

{% include start.html %}
LDA #$c0  ;Load the hex value $c0 into the A register
TAX       ;Transfer the value in the A register to X
INX       ;Increment the value in the X register
ADC #$c4  ;Add the hex value $cc to the A register
BRK       ;Break - we're done
{% include end.html %}

Compile the code, then turn on the debugger and step through the code, watching
the `A` and `X` registers. Something slightly odd happens on the line `ADC #$c4`.
You might expect that adding `$c4` to `$c0` would give `$184`, but this
processor gives the result as `$84`. What's up with that?

The problem is, `$184` is too big to fit in a single byte (the max is `$FF`),
and the registers can only hold a single byte.  It's OK though; the processor
isn't actually dumb. If you were looking carefully enough, you'll have noticed
that the carry flag was set to `1` after this operation. So that's how you
know.

In the simulator below **type** (don't paste) the following code:

    LDA #$80
    STA $01
    ADC $01

{% include widget.html %}

An important thing to notice here is the distinction between `ADC #$01` and
`ADC $01`. The first one adds the value `$01` to the `A` register, but the
second adds the value stored at memory location `$01` to the `A` register.

Compile, check the **Monitor** checkbox, then step through these three
instructions. The monitor shows a section of memory, and can be helpful to
visualise the execution of programs. `STA $01` stores the value of the `A`
register at memory location `$01`, and `ADC $01` adds the value stored at the
memory location `$01` to the `A` register. `$80 + $80` should equal `$100`, but
because this is bigger than a byte, the `A` register is set to `$00` and the
carry flag is set. As well as this though, the zero flag is set. The zero flag
is set by all instructions where the result is zero.

A full list of the 6502 instruction set is [available
here](http://www.6502.org/tutorials/6502opcodes.html) and
[here](http://www.obelisk.demon.co.uk/6502/reference.html) (I usually refer to
both pages as they have their strengths and weaknesses). These pages detail the
arguments to each instruction, which registers they use, and which flags they
set. They are your bible.

###Exercises###

1. You've seen `TAX`. You can probably guess what `TAY`, `TXA` and `TYA` do,
   but write some code to test your assumptions.
2. Rewrite the first example in this section to use the `Y` register instead of
   the `X` register.
3. The opposite of `ADC` is `SBC` (subtract with carry). Write a program that
   uses this instruction.


<h2 id='branching'>Branching</h2>

So far we're only able to write basic programs without any branching logic.
Let's change that.

6502 assembly language has a bunch of branching instructions, all of which
branch based on whether certain flags are set or not. In this example we'll be
looking at `BNE`: "Branch on not equal".

{% include start.html %}
  LDX #$08
decrement:
  DEX
  STX $0200
  CPX #$03
  BNE decrement
  STX $0201
  BRK
{% include end.html %}

First we load the value `$08` into the `X` register. The next line is a label.
Labels just mark certain points in a program so we can return to them later.
After the label we decrement `X`, store it to `$0200` (the top-left pixel), and
then compare it to the value `$03`.
[`CPX`](http://www.obelisk.demon.co.uk/6502/reference.html#CPX) compares the
value in the `X` register with another value. If the two values are equal, the
`Z` flag is set to `1`, otherwise it is set to `0`.

The next line, `BNE decrement`, will shift execution to the decrement label if
the `Z` flag is set to `0` (meaning that the two values in the `CPX` comparison
were not equal), otherwise it does nothing and we store `X` to `$0201`, then
finish the program.

In assembly language, you'll usually use labels with branch instructions. When
compiled though, this label is converted to a single-byte relative offset (a
number of bytes to go backwards or forwards from the next instruction) so
branch instructions can only go forward and back around 256 bytes. This means
they can only be used to move around local code. For moving further you'll need
to use the jumping instructions.

###Exercises###

1. The opposite of `BNE` is `BEQ`. Try writing a program that uses `BEQ`.
2. `BCC` and `BCS` ("branch on carry clear" and "branch on carry set") are used
   to branch on the carry flag. Write a program that uses one of these two.


<h2 id='addressing'>Addressing modes</h2>

The 6502 uses a 16-bit address bus, meaning that there are 65536 bytes of
memory available to the processor. Remember that a byte is represented by two
hex characters, so the memory locations are generally represented as `$0000 -
$ffff`. There are various ways to refer to these memory locations, as detailed below.

With all these examples you might find it helpful to use the memory monitor to
watch the memory change. The monitor takes a starting memory location and a
number of bytes to display from that location. Both of these are hex values.
For example, to display 16 bytes of memory from `$c000`, enter `c000` and `10`
into **Start** and **Length**, respectively.

###Absolute: `$c000`###

With absolute addressing, the full memory location is used as the argument to the instruction. For example:

    STA $c000 ;Store the value in the accumulator at memory location $c000

###Zero page: `$c0`###

All instructions that support absolute addressing (with the exception of the jump
instructions) also have the option to take a single-byte address. This type of
addressing is called "zero page" - only the first page (the first 256 bytes) of
memory is accessible. This is faster, as only one byte needs to be looked up,
and takes up less space in the compiled code as well.

###Zero page,X: `$c0,X`###

This is where addressing gets interesting. In this mode, a zero page address is given, and then the value of the `X` register is added. Here is an example:

    LDX #$01   ;X is $01
    LDA #$aa   ;A is $aa
    STA $a0,X ;Store the value of A at memory location $a1
    INX        ;Increment X
    STA $a0,X ;Store the value of A at memory location $a2

If the result of the addition is larger than a single byte, the address wraps around. For example:

    LDX #$05
    STA $ff,X ;Store the value of A at memory location $04

###Zero page,Y: `$c0,Y`###

This is the equivalent of zero page,X, but can only be used with `LDX` and `STX`.

###Absolute,X and absolute,Y: `$c000,X` and `$c000,Y`###

These are the absolute addressing versions of zero page,X and zero page,Y. For example:

    LDX #$01
    STA $0200,X ;Store the value of A at memory location $0201

###Immediate: `#$c0`###

Immediate addressing doesn't strictly deal with memory addresses - this is the
mode where actual values are used. For example, `LDX #$01` loads the value
`$01` into the `X` register. This is very different to the zero page
instruction `LDX $01` which loads the value at memory location `$01` into the
`X` register.

###Relative: `$c0` (or label)###

Relative addressing is used for branching instructions. These instructions take
a single byte, which is used as an offset from the following instruction.

Compile the following code, then click the **Hexdump** button to see the compiled code.

{% include start.html %}
  LDA #$01
  CMP #$02
  BNE notequal
  STA $22
notequal:
  BRK
{% include end.html %}

The hex should look something like this:

    a9 01 c9 02 d0 02 85 22 00

`a9` and `c9` are the processor opcodes for immediate-addressed `LDA` and `CMP`
respectively. `01` and `02` are the arguments to these instructions. `d0` is
the opcode for `BNE`, and its argument is `02`. This means "skip over the next
two bytes" (`85 22`, the compiled version of `STA $22`). Try editing the code
so `STA` takes a two-byte absolute address rather than a single-byte zero page
address (e.g. change `STA $22` to `STA $2222`). Recompile the code and look at
the hexdump again - the argument to `BNE` should now be `03`, because the
instruction the processor is skipping past is now three bytes long.

###Implicit###

Some instructions don't deal with memory locations (e.g. `INX` - increment the
`X` register). These are said to have implicit addressing - the argument is
implied by the instruction.

###Indirect: `($c000)`###

Indirect addressing uses an absolute address to look up another address. The
first address gives the least significant byte of the address, and the
following byte gives the most significant byte. That can be hard to wrap your
head around, so here's an example:

{% include start.html %}
LDA #$01
STA $f0
LDA #$cc
STA $f1
JMP ($00f0) ;dereferences to $cc01
{% include end.html %}

In this example, `$f0` contains the value `$01` and `$f1` contains the value
`$cc`. The instruction `JMP ($f0)` causes the processor to look up the two
bytes at `$f0` and `$f1` (`$01` and `$cc`) and put them together to form the
address `$cc01`, which becomes the new program counter. Compile and step
through the program above to see what happens. I'll talk more about `JMP` in
the section on [Jumping](#jumping).

###Indexed indirect: `($c0,X)`###

This one's kinda weird. It's like a cross between zero page,X and indirect.
Basically, you take the zero page address, add the value of the `X` register to
it, then use that to look up a two-byte address. For example:

{% include start.html %}
LDX #$01
LDA #$05
STA $01
LDA #$06
STA $02
LDY #$0a
STY $0605
LDA ($00,X)
{% include end.html %}

Memory locations `$01` and `$02` contain the values `$05` and `$06`
respectively. Think of `($00,X)` as `($00 + X)`. In this case `X` is `$01`, so
this simplifies to `($01)`. From here things proceed like standard indirect
addressing - the two bytes at `$01` and `$02` (`$05` and `$06`) are looked up
to form the address `$0605`.  This is the address that the `Y` register was
stored into in the previous instruction, so the `A` register gets the same
value as `Y`, albeit through a much more circuitous route. You won't see this
much.


###Indirect indexed: `($c0),Y`###

Indirect indexed is like indexed indirect but less insane. Instead of adding
the `X` register to the address *before* dereferencing, the zero page address
is dereferenced, and the `Y` register is added to the resulting address.

{% include start.html %}
LDY #$01
LDA #$03
STA $01
LDA #$07
STA $02
LDX #$0a
STX $0704
LDA ($01),Y
{% include end.html %}

In this case, `($01)` looks up the two bytes at `$01` and `$02`: `$03` and
`$07`. These form the address `$0703`. The value of the `Y` register is added
to this address to give the final address `$0704`.

###Exercise###

1. Try to write code snippets that use each of the 6502 addressing modes.
   Remember, you can use the monitor to watch a section of memory.


<h2 id='stack'>The stack</h2>

The stack in a 6502 processor is just like any other stack - values are pushed
onto it and popped ("pulled" in 6502 parlance) off it. The current depth of the
stack is measured by the stack pointer, a special register. The stack lives in
memory between `$0100` and `$01ff`. The stack pointer is initially `$ff`, which
points to memory location `$01ff`. When a byte is pushed onto the stack, the
stack pointer becomes `$fe`, or memory location `$01fe`, and so on.

Two of the stack instructions are `PHA` and `PLA`, "push accumulator" and "pull
accumulator". Below is an example of these two in action.

{% include start.html %}
  LDX #$00
  LDY #$00
firstloop:
  TXA
  STA $0200,Y
  PHA
  INX
  INY
  CPY #$10
  BNE firstloop ;loop until Y is $10
secondloop:
  PLA
  STA $0200,Y
  INY
  CPY #$20      ;loop until Y is $20
  BNE secondloop
{% include end.html %}

`X` holds the pixel colour, and `Y` holds the position of the current pixel.
The first loop draws the current colour as a pixel (via the `A` register),
pushes the colour to the stack, then increments the colour and position.  The
second loop pops the stack, draws the popped colour as a pixel, then increments
the position. As should be expected, this creates a mirrored pattern.


<h2 id='jumping'>Jumping</h2>

Jumping is like branching with two main differences. First, jumps are not
conditionally executed, and second, they take a two-byte absolute address. For
small programs, this second detail isn't very important, as you'll mostly be
using labels, and the assembler works out the correct memory location from the
label. For larger programs though, jumping is the only way to move from one
section of the code to another.

###JMP###

`JMP` is an unconditional jump. Here's a really simple example to show it in action:

{% include start.html %}
  LDA #$03
  JMP there
  BRK
  BRK
  BRK
there:
  STA $0200
{% include end.html %}


###JSR/RTS###

`JSR` and `RTS` ("jump to subroutine" and "return from subroutine") are a
dynamic duo that you'll usually see used together. `JSR` is used to jump from
the current location to another part of the code. `RTS` returns to the previous
position. This is basically like calling a function and returning.

The processor knows where to return to because `JSR` pushes the address minus
one of the next instruction onto the stack before jumping to the given
location. `RTS` pops this location, adds one to it, and jumps to that location.
An example:

{% include start.html %}
  JSR init
  JSR loop
  JSR end

init:
  LDX #$00
  RTS

loop:
  INX
  CPX #$05
  BNE loop
  RTS

end:
  BRK
{% include end.html %}

The first instruction causes execution to jump to the `init` label. This sets
`X`, then returns to the next instruction, `JSR loop`. This jumps to the `loop`
label, which increments `X` until it is equal to `$05`. After that we return to
the next instruction, `JSR end`, which jumps to the end of the file. This
illustrates how `JSR` and `RTS` can be used together to create modular code.

<!-- This section is all about installing software. Let's leave that till it's necessary.

There are a few things you'll want on your computer in order to get up and
running.  The first is an assembler. This is the program that converts your
assembly language into machine code. The second is a monitor. This is like a
debugger - it lets you step through your program from any point and inspect the
memory and registers. At some point you'll want an Atari emulator, so you run
your programs in their natural habitat, but we'll leave that for now.

I'm going to assume you're using a Mac. All the tools I'm going to recommend
will work cross-platform, but the installation instructions might be different.

Finally, a warning. We'll mainly be representing numbers and memory locations
in [hexadecimal format](http://en.wikipedia.org/wiki/Hexadecimal). If that
means nothing to you, click on that link there.



###The assembler

We'll be using the DASM assembler. If you have
[Homebrew](http://mxcl.github.com/homebrew/) installed with version 0.9 or
later, installation should be as easy as

    brew install dasm

Otherwise, [here's a link to download
it](http://mac.softpedia.com/progDownload/DASM-Download-34013.html) and [here are
some instructions on installing it](http://blog.feltpad.net/dasm-on-mac-osx/).

###The monitor

To make sense of our assembled files, we'll run them in a monitor. The best one
I've found so far is called [py65](https://github.com/mnaberez/py65). You
should just be able to install it with

    easy_install -U py65

but if you have trouble [go to the Github page](https://github.com/mnaberez/py65).

<h2 id="first-program">Our first program</h2>

Now, let's try writing a working program. Fire up your favourite text editor
and enter this:

      processor 6502
      ORG $C000

      LDA #$01
      STA $01
      LDA #$0a
      STA $02
      LDA #$0f
      STA $03
      BRK

Make sure each line has a two-space indent (the left margin is saved for
labels). Save the file as `example.asm`.

Now, go to the terminal and run:

    dasm example.asm -f3 -v1 -oexample.bin

The `-f` flag is the output format. You always want that to be `3`. `-v` is for
verbose (there are *five* different verbosity levels - possibly slightly
excessive) and `-o` specifies the output filename (in this case `example.bin`).

You can use the `hexdump` tool to see what this program looks like. `hexdump`
outputs each byte in the program as a hex pair. Run `hexdump example.bin` to
see the bytes. This can be a useful debugging tool.

Hopefully this will compile without error, and you'll have a new file called
`example.bin` in your directory. The next step is to load this file up in the
py65 monitor program. To start the monitor, run `py65mon`. This should open up
with a load of output, and give you a `.` prompt. At the prompt type:

    .load example.bin c000

This will load the file into the memory location c000. The output should look
something like:

    Wrote +13 bytes from $c000 to $c00c

We can use the `mem` command to inspect the memory in that byte range like so:

    .mem c000:c00c

This should output something like:

    c000:  a9  01  85  01  a9  0a  85  02  a9  0f  85  03  00

which should be what `hexdump` output as well. We can also convert the machine
code back into assembler language with the `disassemble` command:

    .disassemble c000:c00c

which will output a list of the bytes and their equivalent assembly language
instructions.  By this point you should see that there is basically a
one-to-one mapping between assembly language instructions and compiled bytes.
We really are speaking the computer's language now.

You may notice that the first two lines of the `.asm` file aren't in the
disassembly - these were just instructions to the compiler so they don't end up in
the compiled program.

###Stepping through the program

With this program loaded into the monitor, we can step through it to see how
the computer reacts to each of the instructions. Machine code is read
instruction-by-instruction by the processor. The computer keeps track of the current
instruction using its program counter, which increments after every instruction. To
step through our program we'll first have to move the program counter to the start
of the program. This can be done like so:

    .registers pc=c000

This sets the `pc` (program counter) register to the memory location of the first
instruction of our program. You'll see in the output that `PC` is now `c000`.

Type `step` to execute the first instruction. The first thing to be output
(confusingly) is the next instruction (which hasn't been executed yet). After
that the values of the registers will be output. You'll hopefully notice that
two of the registers have changed. `PC` has increased to `c002` and `AC` is now
`01`. `LDA #$01` means "Load the number 1 into register A". The `$` denotes
hexadecimal values, and the `#` means "this actual number" rather than the
memory location `$01`.

Type `step` again to execute the next command. `STA $01` means "Store the value
in register A into the memory location $01". We can view the contents of memory
in the bytes from `$01` to `$03` with the command:

    .mem 01:03

You'll see from this output that the value 1 has been stored in the second byte
of memory. Now keep stepping through the code, keeping an eye on the A register
and inspecting the memory in the first three bytes, until you reach the end of
the code. Once you've finished, we'll have stored the values `$01`, `$0a` and
`$0f` into memory locations `$01`, `$02` and `$03`. Pretty awesome eh? You
can't do *that* in JavaScript!

-->



