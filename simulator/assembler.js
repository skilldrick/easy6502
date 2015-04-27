/*
 *  6502 assembler and simulator in Javascript
 *  (C)2006-2010 Stian Soreng - www.6502asm.com
 *
 *  Adapted by Nick Morgan
 *  https://github.com/skilldrick/6502js
 *
 *  Released under the GNU General Public License
 *  see http://gnu.org/licenses/gpl.html
 */

'use strict';

function SimulatorWidget(node) {
  var $node = $(node);
  var ui = UI();
  var display = Display();
  var memory = Memory();
  var labels = Labels();
  var simulator = Simulator();
  var assembler = Assembler();

  function initialize() {
    stripText();
    ui.initialize();
    display.initialize();
    simulator.reset();

    $node.find('.assembleButton').click(function () {
      assembler.assembleCode();
    });
    $node.find('.runButton').click(simulator.runBinary);
    $node.find('.runButton').click(simulator.stopDebugger);
    $node.find('.resetButton').click(simulator.reset);
    $node.find('.hexdumpButton').click(assembler.hexdump);
    $node.find('.disassembleButton').click(assembler.disassemble);
    $node.find('.debug').change(function () {
      var debug = $(this).is(':checked');
      if (debug) {
        ui.debugOn();
        simulator.enableDebugger();
      } else {
        ui.debugOff();
        simulator.stopDebugger();
      }
    });
    $node.find('.monitoring').change(function () {
      ui.toggleMonitor();
      simulator.toggleMonitor();
    });
    $node.find('.start, .length').blur(simulator.handleMonitorRangeChange);
    $node.find('.stepButton').click(simulator.debugExec);
    $node.find('.gotoButton').click(simulator.gotoAddr);
    $node.find('.notesButton').click(ui.showNotes);
    $node.find('.code').on('keypress input', simulator.stop);
    $node.find('.code').on('keypress input', ui.initialize);
    $(document).keypress(memory.storeKeypress);

    simulator.handleMonitorRangeChange();
  }

  function stripText() {
    //Remove leading and trailing space in textarea
    var text = $node.find('.code').val();
    text = text.replace(/^\n+/, '').replace(/\s+$/, '');
    $node.find('.code').val(text);
  }

  function UI() {
    var currentState;

    var start = {
      assemble: true,
      run: [false, 'Run'],
      reset: false,
      hexdump: false,
      disassemble: false,
      debug: [false, false]
    };
    var assembled = {
      assemble: false,
      run: [true, 'Run'],
      reset: true,
      hexdump: true,
      disassemble: true,
      debug: [true, false]
    };
    var running = {
      assemble: false,
      run: [true, 'Stop'],
      reset: true,
      hexdump: false,
      disassemble: false,
      debug: [true, false]
    };
    var debugging = {
      assemble: false,
      reset: true,
      hexdump: true,
      disassemble: true,
      debug: [true, true]
    };
    var postDebugging = {
      assemble: false,
      reset: true,
      hexdump: true,
      disassemble: true,
      debug: [true, false]
    };


    function setState(state) {
      $node.find('.assembleButton').attr('disabled', !state.assemble);
      if (state.run) {
        $node.find('.runButton').attr('disabled', !state.run[0]);
        $node.find('.runButton').val(state.run[1]);
      }
      $node.find('.resetButton').attr('disabled', !state.reset);
      $node.find('.hexdumpButton').attr('disabled', !state.hexdump);
      $node.find('.disassembleButton').attr('disabled', !state.disassemble);
      $node.find('.debug').attr('disabled', !state.debug[0]);
      $node.find('.debug').attr('checked', state.debug[1]);
      $node.find('.stepButton').attr('disabled', !state.debug[1]);
      $node.find('.gotoButton').attr('disabled', !state.debug[1]);
      currentState = state;
    }

    function initialize() {
      setState(start);
    }

    function play() {
      setState(running);
    }

    function stop() {
      setState(assembled);
    }

    function debugOn() {
      setState(debugging);
    }

    function debugOff() {
      setState(postDebugging);
    }

    function assembleSuccess() {
      setState(assembled);
    }

    function toggleMonitor() {
      $node.find('.monitor').toggle();
    }

    function showNotes() {
      $node.find('.messages code').html($node.find('.notes').html());
    }

    return {
      initialize: initialize,
      play: play,
      stop: stop,
      assembleSuccess: assembleSuccess,
      debugOn: debugOn,
      debugOff: debugOff,
      toggleMonitor: toggleMonitor,
      showNotes: showNotes
    };
  }


  function Display() {
    var displayArray = [];
    var palette = [
      "#000000", "#ffffff", "#880000", "#aaffee",
      "#cc44cc", "#00cc55", "#0000aa", "#eeee77",
      "#dd8855", "#664400", "#ff7777", "#333333",
      "#777777", "#aaff66", "#0088ff", "#bbbbbb"
    ];
    var ctx;
    var width;
    var height;
    var pixelSize;
    var numX = 32;
    var numY = 32;

    function initialize() {
      var canvas = $node.find('.screen')[0];
      width = canvas.width;
      height = canvas.height;
      pixelSize = width / numX;
      ctx = canvas.getContext('2d');
      reset();
    }

    function reset() {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);
    }

    function updatePixel(addr) {
      ctx.fillStyle = palette[memory.get(addr) & 0x0f];
      var y = Math.floor((addr - 0x200) / 32);
      var x = (addr - 0x200) % 32;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }

    return {
      initialize: initialize,
      reset: reset,
      updatePixel: updatePixel
    };
  }

  function Memory() {
    var memArray = new Array(0x600);

    function set(addr, val) {
      return memArray[addr] = val;
    }

    function get(addr) {
      return memArray[addr];
    }

    function getWord(addr) {
      return get(addr) + (get(addr + 1) << 8);
    }

    // Poke a byte, don't touch any registers
    function storeByte(addr, value) {
      set(addr, value & 0xff);
      if ((addr >= 0x200) && (addr <= 0x5ff)) {
        display.updatePixel(addr);
      }
    }

    // Store keycode in ZP $ff
    function storeKeypress(e) {
      var value = e.which;
      memory.storeByte(0xff, value);
    }

    function format(start, length) {
      var html = '';
      var n;

      for (var x = 0; x < length; x++) {
        if ((x & 15) === 0) {
          if (x > 0) { html += "\n"; }
          n = (start + x);
          html += num2hex(((n >> 8) & 0xff));
          html += num2hex((n & 0xff));
          html += ": ";
        }
        html += num2hex(memory.get(start + x));
        html += " ";
      }
      return html;
    }

    return {
      set: set,
      get: get,
      getWord: getWord,
      storeByte: storeByte,
      storeKeypress: storeKeypress,
      format: format
    };
  }

  function Simulator() {
    var regA = 0;
    var regX = 0;
    var regY = 0;
    var regP = 0;
    var regPC = 0x600;
    var regSP = 0xff;
    var codeRunning = false;
    var debug = false;
    var monitoring = false;
    var executeId;

    // Set zero and negative processor flags based on result
    function setNVflags(value) {
      if (value) {
        regP &= 0xfd;
      } else {
        regP |= 0x02;
      }
      if (value & 0x80) {
        regP |= 0x80;
      } else {
        regP &= 0x7f;
      }
    }

    function setCarryFlagFromBit0(value) {
      regP = (regP & 0xfe) | (value & 1);
    }

    function setCarryFlagFromBit7(value) {
      regP = (regP & 0xfe) | ((value >> 7) & 1);
    }

    function setNVflagsForRegA() {
      setNVflags(regA);
    }

    function setNVflagsForRegX() {
      setNVflags(regX);
    }

    function setNVflagsForRegY() {
      setNVflags(regY);
    }

    var ORA = setNVflagsForRegA;
    var AND = setNVflagsForRegA;
    var EOR = setNVflagsForRegA;
    var ASL = setNVflags;
    var LSR = setNVflags;
    var ROL = setNVflags;
    var ROR = setNVflags;
    var LDA = setNVflagsForRegA;
    var LDX = setNVflagsForRegX;
    var LDY = setNVflagsForRegY;

    function BIT(value) {
      if (value & 0x80) {
        regP |= 0x80;
      } else {
        regP &= 0x7f;
      }
      if (value & 0x40) {
        regP |= 0x40;
      } else {
        regP &= ~0x40;
      }
      if (regA & value) {
        regP &= 0xfd;
      } else {
        regP |= 0x02;
      }
    }

    function CLC() {
      regP &= 0xfe;
    }

    function SEC() {
      regP |= 1;
    }


    function CLV() {
      regP &= 0xbf;
    }

    function setOverflow() {
      regP |= 0x40;
    }

    function DEC(addr) {
      var value = memory.get(addr);
      value--;
      value &= 0xff;
      memory.storeByte(addr, value);
      setNVflags(value);
    }

    function INC(addr) {
      var value = memory.get(addr);
      value++;
      value &= 0xff;
      memory.storeByte(addr, value);
      setNVflags(value);
    }

    function jumpBranch(offset) {
      if (offset > 0x7f) {
        regPC = (regPC - (0x100 - offset));
      } else {
        regPC = (regPC + offset);
      }
    }

    function overflowSet() {
      return regP & 0x40;
    }

    function decimalMode() {
      return regP & 8;
    }

    function carrySet() {
      return regP & 1;
    }

    function negativeSet() {
      return regP & 0x80;
    }

    function zeroSet() {
      return regP & 0x02;
    }

    function doCompare(reg, val) {
      if (reg >= val) {
        SEC();
      } else {
        CLC();
      }
      val = (reg - val);
      setNVflags(val);
    }

    function testSBC(value) {
      var tmp, w;
      if ((regA ^ value) & 0x80) {
        setOverflow();
      } else {
        CLV();
      }

      if (decimalMode()) {
        tmp = 0xf + (regA & 0xf) - (value & 0xf) + carrySet();
        if (tmp < 0x10) {
          w = 0;
          tmp -= 6;
        } else {
          w = 0x10;
          tmp -= 0x10;
        }
        w += 0xf0 + (regA & 0xf0) - (value & 0xf0);
        if (w < 0x100) {
          CLC();
          if (overflowSet() && w < 0x80) { CLV(); }
          w -= 0x60;
        } else {
          SEC();
          if (overflowSet() && w >= 0x180) { CLV(); }
        }
        w += tmp;
      } else {
        w = 0xff + regA - value + carrySet();
        if (w < 0x100) {
          CLC();
          if (overflowSet() && w < 0x80) { CLV(); }
        } else {
          SEC();
          if (overflowSet() && w >= 0x180) { CLV(); }
        }
      }
      regA = w & 0xff;
      setNVflagsForRegA();
    }

    function testADC(value) {
      var tmp;
      if ((regA ^ value) & 0x80) {
        CLV();
      } else {
        setOverflow();
      }

      if (decimalMode()) {
        tmp = (regA & 0xf) + (value & 0xf) + carrySet();
        if (tmp >= 10) {
          tmp = 0x10 | ((tmp + 6) & 0xf);
        }
        tmp += (regA & 0xf0) + (value & 0xf0);
        if (tmp >= 160) {
          SEC();
          if (overflowSet() && tmp >= 0x180) { CLV(); }
          tmp += 0x60;
        } else {
          CLC();
          if (overflowSet() && tmp < 0x80) { CLV(); }
        }
      } else {
        tmp = regA + value + carrySet();
        if (tmp >= 0x100) {
          SEC();
          if (overflowSet() && tmp >= 0x180) { CLV(); }
        } else {
          CLC();
          if (overflowSet() && tmp < 0x80) { CLV(); }
        }
      }
      regA = tmp & 0xff;
      setNVflagsForRegA();
    }

    var instructions = {
      i00: function () {
        codeRunning = false;
        //BRK
      },

      i01: function () {
        var zp = (popByte() + regX) & 0xff;
        var addr = memory.getWord(zp);
        var value = memory.get(addr);
        regA |= value;
        ORA();
      },

      i05: function () {
        var zp = popByte();
        regA |= memory.get(zp);
        ORA();
      },

      i06: function () {
        var zp = popByte();
        var value = memory.get(zp);
        setCarryFlagFromBit7(value);
        value = value << 1;
        memory.storeByte(zp, value);
        ASL(value);
      },

      i08: function () {
        stackPush(regP | 0x30);
        //PHP
      },

      i09: function () {
        regA |= popByte();
        ORA();
      },

      i0a: function () {
        setCarryFlagFromBit7(regA);
        regA = (regA << 1) & 0xff;
        ASL(regA);
      },

      i0d: function () {
        regA |= memory.get(popWord());
        ORA();
      },

      i0e: function () {
        var addr = popWord();
        var value = memory.get(addr);
        setCarryFlagFromBit7(value);
        value = value << 1;
        memory.storeByte(addr, value);
        ASL(value);
      },

      i10: function () {
        var offset = popByte();
        if (!negativeSet()) { jumpBranch(offset); }
        //BPL
      },

      i11: function () {
        var zp = popByte();
        var value = memory.getWord(zp) + regY;
        regA |= memory.get(value);
        ORA();
      },

      i15: function () {
        var addr = (popByte() + regX) & 0xff;
        regA |= memory.get(addr);
        ORA();
      },

      i16: function () {
        var addr = (popByte() + regX) & 0xff;
        var value = memory.get(addr);
        setCarryFlagFromBit7(value);
        value = value << 1;
        memory.storeByte(addr, value);
        ASL(value);
      },

      i18: function () {
        CLC();
      },

      i19: function () {
        var addr = popWord() + regY;
        regA |= memory.get(addr);
        ORA();
      },

      i1d: function () {
        var addr = popWord() + regX;
        regA |= memory.get(addr);
        ORA();
      },

      i1e: function () {
        var addr = popWord() + regX;
        var value = memory.get(addr);
        setCarryFlagFromBit7(value);
        value = value << 1;
        memory.storeByte(addr, value);
        ASL(value);
      },

      i20: function () {
        var addr = popWord();
        var currAddr = regPC - 1;
        stackPush(((currAddr >> 8) & 0xff));
        stackPush((currAddr & 0xff));
        regPC = addr;
        //JSR
      },

      i21: function () {
        var zp = (popByte() + regX) & 0xff;
        var addr = memory.getWord(zp);
        var value = memory.get(addr);
        regA &= value;
        AND();
      },

      i24: function () {
        var zp = popByte();
        var value = memory.get(zp);
        BIT(value);
      },

      i25: function () {
        var zp = popByte();
        regA &= memory.get(zp);
        AND();
      },

      i26: function () {
        var sf = carrySet();
        var addr = popByte();
        var value = memory.get(addr);
        setCarryFlagFromBit7(value);
        value = value << 1;
        value |= sf;
        memory.storeByte(addr, value);
        ROL(value);
      },

      i28: function () {
        regP = stackPop() | 0x30; // There is no B bit!
        //PLP
      },

      i29: function () {
        regA &= popByte();
        AND();
      },

      i2a: function () {
        var sf = carrySet();
        setCarryFlagFromBit7(regA);
        regA = (regA << 1) & 0xff;
        regA |= sf;
        ROL(regA);
      },

      i2c: function () {
        var value = memory.get(popWord());
        BIT(value);
      },

      i2d: function () {
        var value = memory.get(popWord());
        regA &= value;
        AND();
      },

      i2e: function () {
        var sf = carrySet();
        var addr = popWord();
        var value = memory.get(addr);
        setCarryFlagFromBit7(value);
        value = value << 1;
        value |= sf;
        memory.storeByte(addr, value);
        ROL(value);
      },

      i30: function () {
        var offset = popByte();
        if (negativeSet()) { jumpBranch(offset); }
        //BMI
      },

      i31: function () {
        var zp = popByte();
        var value = memory.getWord(zp) + regY;
        regA &= memory.get(value);
        AND();
      },

      i35: function () {
        var addr = (popByte() + regX) & 0xff;
        regA &= memory.get(addr);
        AND();
      },

      i36: function () {
        var sf = carrySet();
        var addr = (popByte() + regX) & 0xff;
        var value = memory.get(addr);
        setCarryFlagFromBit7(value);
        value = value << 1;
        value |= sf;
        memory.storeByte(addr, value);
        ROL(value);
      },

      i38: function () {
        SEC();
      },

      i39: function () {
        var addr = popWord() + regY;
        var value = memory.get(addr);
        regA &= value;
        AND();
      },

      i3d: function () {
        var addr = popWord() + regX;
        var value = memory.get(addr);
        regA &= value;
        AND();
      },

      i3e: function () {
        var sf = carrySet();
        var addr = popWord() + regX;
        var value = memory.get(addr);
        setCarryFlagFromBit7(value);
        value = value << 1;
        value |= sf;
        memory.storeByte(addr, value);
        ROL(value);
      },

      i40: function () {
        regP = stackPop() | 0x30; // There is no B bit!
        regPC = stackPop() | (stackPop() << 8);
        //RTI
      },

      i41: function () {
        var zp = (popByte() + regX) & 0xff;
        var value = memory.getWord(zp);
        regA ^= memory.get(value);
        EOR();
      },

      i45: function () {
        var addr = popByte() & 0xff;
        var value = memory.get(addr);
        regA ^= value;
        EOR();
      },

      i46: function () {
        var addr = popByte() & 0xff;
        var value = memory.get(addr);
        setCarryFlagFromBit0(value);
        value = value >> 1;
        memory.storeByte(addr, value);
        LSR(value);
      },

      i48: function () {
        stackPush(regA);
        //PHA
      },

      i49: function () {
        regA ^= popByte();
        EOR();
      },

      i4a: function () {
        setCarryFlagFromBit0(regA);
        regA = regA >> 1;
        LSR(regA);
      },

      i4c: function () {
        regPC = popWord();
        //JMP
      },

      i4d: function () {
        var addr = popWord();
        var value = memory.get(addr);
        regA ^= value;
        EOR();
      },

      i4e: function () {
        var addr = popWord();
        var value = memory.get(addr);
        setCarryFlagFromBit0(value);
        value = value >> 1;
        memory.storeByte(addr, value);
        LSR(value);
      },

      i50: function () {
        var offset = popByte();
        if (!overflowSet()) { jumpBranch(offset); }
        //BVC
      },

      i51: function () {
        var zp = popByte();
        var value = memory.getWord(zp) + regY;
        regA ^= memory.get(value);
        EOR();
      },

      i55: function () {
        var addr = (popByte() + regX) & 0xff;
        regA ^= memory.get(addr);
        EOR();
      },

      i56: function () {
        var addr = (popByte() + regX) & 0xff;
        var value = memory.get(addr);
        setCarryFlagFromBit0(value);
        value = value >> 1;
        memory.storeByte(addr, value);
        LSR(value);
      },

      i58: function () {
        regP &= ~0x04;
        throw new Error("Interrupts not implemented");
        //CLI
      },

      i59: function () {
        var addr = popWord() + regY;
        var value = memory.get(addr);
        regA ^= value;
        EOR();
      },

      i5d: function () {
        var addr = popWord() + regX;
        var value = memory.get(addr);
        regA ^= value;
        EOR();
      },

      i5e: function () {
        var addr = popWord() + regX;
        var value = memory.get(addr);
        setCarryFlagFromBit0(value);
        value = value >> 1;
        memory.storeByte(addr, value);
        LSR(value);
      },

      i60: function () {
        regPC = (stackPop() | (stackPop() << 8)) + 1;
        //RTS
      },

      i61: function () {
        var zp = (popByte() + regX) & 0xff;
        var addr = memory.getWord(zp);
        var value = memory.get(addr);
        testADC(value);
        //ADC
      },

      i65: function () {
        var addr = popByte();
        var value = memory.get(addr);
        testADC(value);
        //ADC
      },

      i66: function () {
        var sf = carrySet();
        var addr = popByte();
        var value = memory.get(addr);
        setCarryFlagFromBit0(value);
        value = value >> 1;
        if (sf) { value |= 0x80; }
        memory.storeByte(addr, value);
        ROR(value);
      },

      i68: function () {
        regA = stackPop();
        setNVflagsForRegA();
        //PLA
      },

      i69: function () {
        var value = popByte();
        testADC(value);
        //ADC
      },

      i6a: function () {
        var sf = carrySet();
        setCarryFlagFromBit0(regA);
        regA = regA >> 1;
        if (sf) { regA |= 0x80; }
        ROR(regA);
      },

      i6c: function () {
        regPC = memory.getWord(popWord());
        //JMP
      },

      i6d: function () {
        var addr = popWord();
        var value = memory.get(addr);
        testADC(value);
        //ADC
      },

      i6e: function () {
        var sf = carrySet();
        var addr = popWord();
        var value = memory.get(addr);
        setCarryFlagFromBit0(value);
        value = value >> 1;
        if (sf) { value |= 0x80; }
        memory.storeByte(addr, value);
        ROR(value);
      },

      i70: function () {
        var offset = popByte();
        if (overflowSet()) { jumpBranch(offset); }
        //BVS
      },

      i71: function () {
        var zp = popByte();
        var addr = memory.getWord(zp);
        var value = memory.get(addr + regY);
        testADC(value);
        //ADC
      },

      i75: function () {
        var addr = (popByte() + regX) & 0xff;
        var value = memory.get(addr);
        testADC(value);
        //ADC
      },

      i76: function () {
        var sf = carrySet();
        var addr = (popByte() + regX) & 0xff;
        var value = memory.get(addr);
        setCarryFlagFromBit0(value);
        value = value >> 1;
        if (sf) { value |= 0x80; }
        memory.storeByte(addr, value);
        ROR(value);
      },

      i78: function () {
        regP |= 0x04;
        throw new Error("Interrupts not implemented");
        //SEI
      },

      i79: function () {
        var addr = popWord();
        var value = memory.get(addr + regY);
        testADC(value);
        //ADC
      },

      i7d: function () {
        var addr = popWord();
        var value = memory.get(addr + regX);
        testADC(value);
        //ADC
      },

      i7e: function () {
        var sf = carrySet();
        var addr = popWord() + regX;
        var value = memory.get(addr);
        setCarryFlagFromBit0(value);
        value = value >> 1;
        if (sf) { value |= 0x80; }
        memory.storeByte(addr, value);
        ROR(value);
      },

      i81: function () {
        var zp = (popByte() + regX) & 0xff;
        var addr = memory.getWord(zp);
        memory.storeByte(addr, regA);
        //STA
      },

      i84: function () {
        memory.storeByte(popByte(), regY);
        //STY
      },

      i85: function () {
        memory.storeByte(popByte(), regA);
        //STA
      },

      i86: function () {
        memory.storeByte(popByte(), regX);
        //STX
      },

      i88: function () {
        regY = (regY - 1) & 0xff;
        setNVflagsForRegY();
        //DEY
      },

      i8a: function () {
        regA = regX & 0xff;
        setNVflagsForRegA();
        //TXA
      },

      i8c: function () {
        memory.storeByte(popWord(), regY);
        //STY
      },

      i8d: function () {
        memory.storeByte(popWord(), regA);
        //STA
      },

      i8e: function () {
        memory.storeByte(popWord(), regX);
        //STX
      },

      i90: function () {
        var offset = popByte();
        if (!carrySet()) { jumpBranch(offset); }
        //BCC
      },

      i91: function () {
        var zp = popByte();
        var addr = memory.getWord(zp) + regY;
        memory.storeByte(addr, regA);
        //STA
      },

      i94: function () {
        memory.storeByte((popByte() + regX) & 0xff, regY);
        //STY
      },

      i95: function () {
        memory.storeByte((popByte() + regX) & 0xff, regA);
        //STA
      },

      i96: function () {
        memory.storeByte((popByte() + regY) & 0xff, regX);
        //STX
      },

      i98: function () {
        regA = regY & 0xff;
        setNVflagsForRegA();
        //TYA
      },

      i99: function () {
        memory.storeByte(popWord() + regY, regA);
        //STA
      },

      i9a: function () {
        regSP = regX & 0xff;
        //TXS
      },

      i9d: function () {
        var addr = popWord();
        memory.storeByte(addr + regX, regA);
        //STA
      },

      ia0: function () {
        regY = popByte();
        LDY();
      },

      ia1: function () {
        var zp = (popByte() + regX) & 0xff;
        var addr = memory.getWord(zp);
        regA = memory.get(addr);
        LDA();
      },

      ia2: function () {
        regX = popByte();
        LDX();
      },

      ia4: function () {
        regY = memory.get(popByte());
        LDY();
      },

      ia5: function () {
        regA = memory.get(popByte());
        LDA();
      },

      ia6: function () {
        regX = memory.get(popByte());
        LDX();
      },

      ia8: function () {
        regY = regA & 0xff;
        setNVflagsForRegY();
        //TAY
      },

      ia9: function () {
        regA = popByte();
        LDA();
      },

      iaa: function () {
        regX = regA & 0xff;
        setNVflagsForRegX();
        //TAX
      },

      iac: function () {
        regY = memory.get(popWord());
        LDY();
      },

      iad: function () {
        regA = memory.get(popWord());
        LDA();
      },

      iae: function () {
        regX = memory.get(popWord());
        LDX();
      },

      ib0: function () {
        var offset = popByte();
        if (carrySet()) { jumpBranch(offset); }
        //BCS
      },

      ib1: function () {
        var zp = popByte();
        var addr = memory.getWord(zp) + regY;
        regA = memory.get(addr);
        LDA();
      },

      ib4: function () {
        regY = memory.get((popByte() + regX) & 0xff);
        LDY();
      },

      ib5: function () {
        regA = memory.get((popByte() + regX) & 0xff);
        LDA();
      },

      ib6: function () {
        regX = memory.get((popByte() + regY) & 0xff);
        LDX();
      },

      ib8: function () {
        CLV();
      },

      ib9: function () {
        var addr = popWord() + regY;
        regA = memory.get(addr);
        LDA();
      },

      iba: function () {
        regX = regSP & 0xff;
        LDX();
        //TSX
      },

      ibc: function () {
        var addr = popWord() + regX;
        regY = memory.get(addr);
        LDY();
      },

      ibd: function () {
        var addr = popWord() + regX;
        regA = memory.get(addr);
        LDA();
      },

      ibe: function () {
        var addr = popWord() + regY;
        regX = memory.get(addr);
        LDX();
      },

      ic0: function () {
        var value = popByte();
        doCompare(regY, value);
        //CPY
      },

      ic1: function () {
        var zp = (popByte() + regX) & 0xff;
        var addr = memory.getWord(zp);
        var value = memory.get(addr);
        doCompare(regA, value);
        //CPA
      },

      ic4: function () {
        var value = memory.get(popByte());
        doCompare(regY, value);
        //CPY
      },

      ic5: function () {
        var value = memory.get(popByte());
        doCompare(regA, value);
        //CPA
      },

      ic6: function () {
        var zp = popByte();
        DEC(zp);
      },

      ic8: function () {
        regY = (regY + 1) & 0xff;
        setNVflagsForRegY();
        //INY
      },

      ic9: function () {
        var value = popByte();
        doCompare(regA, value);
        //CMP
      },

      ica: function () {
        regX = (regX - 1) & 0xff;
        setNVflagsForRegX();
        //DEX
      },

      icc: function () {
        var value = memory.get(popWord());
        doCompare(regY, value);
        //CPY
      },

      icd: function () {
        var value = memory.get(popWord());
        doCompare(regA, value);
        //CPA
      },

      ice: function () {
        var addr = popWord();
        DEC(addr);
      },

      id0: function () {
        var offset = popByte();
        if (!zeroSet()) { jumpBranch(offset); }
        //BNE
      },

      id1: function () {
        var zp = popByte();
        var addr = memory.getWord(zp) + regY;
        var value = memory.get(addr);
        doCompare(regA, value);
        //CMP
      },

      id5: function () {
        var value = memory.get((popByte() + regX) & 0xff);
        doCompare(regA, value);
        //CMP
      },

      id6: function () {
        var addr = (popByte() + regX) & 0xff;
        DEC(addr);
      },

      id8: function () {
        regP &= 0xf7;
        //CLD
      },

      id9: function () {
        var addr = popWord() + regY;
        var value = memory.get(addr);
        doCompare(regA, value);
        //CMP
      },

      idd: function () {
        var addr = popWord() + regX;
        var value = memory.get(addr);
        doCompare(regA, value);
        //CMP
      },

      ide: function () {
        var addr = popWord() + regX;
        DEC(addr);
      },

      ie0: function () {
        var value = popByte();
        doCompare(regX, value);
        //CPX
      },

      ie1: function () {
        var zp = (popByte() + regX) & 0xff;
        var addr = memory.getWord(zp);
        var value = memory.get(addr);
        testSBC(value);
        //SBC
      },

      ie4: function () {
        var value = memory.get(popByte());
        doCompare(regX, value);
        //CPX
      },

      ie5: function () {
        var addr = popByte();
        var value = memory.get(addr);
        testSBC(value);
        //SBC
      },

      ie6: function () {
        var zp = popByte();
        INC(zp);
      },

      ie8: function () {
        regX = (regX + 1) & 0xff;
        setNVflagsForRegX();
        //INX
      },

      ie9: function () {
        var value = popByte();
        testSBC(value);
        //SBC
      },

      iea: function () {
        //NOP
      },

      iec: function () {
        var value = memory.get(popWord());
        doCompare(regX, value);
        //CPX
      },

      ied: function () {
        var addr = popWord();
        var value = memory.get(addr);
        testSBC(value);
        //SBC
      },

      iee: function () {
        var addr = popWord();
        INC(addr);
      },

      if0: function () {
        var offset = popByte();
        if (zeroSet()) { jumpBranch(offset); }
        //BEQ
      },

      if1: function () {
        var zp = popByte();
        var addr = memory.getWord(zp);
        var value = memory.get(addr + regY);
        testSBC(value);
        //SBC
      },

      if5: function () {
        var addr = (popByte() + regX) & 0xff;
        var value = memory.get(addr);
        testSBC(value);
        //SBC
      },

      if6: function () {
        var addr = (popByte() + regX) & 0xff;
        INC(addr);
      },

      if8: function () {
        regP |= 8;
        //SED
      },

      if9: function () {
        var addr = popWord();
        var value = memory.get(addr + regY);
        testSBC(value);
        //SBC
      },

      ifd: function () {
        var addr = popWord();
        var value = memory.get(addr + regX);
        testSBC(value);
        //SBC
      },

      ife: function () {
        var addr = popWord() + regX;
        INC(addr);
      },

      ierr: function () {
        message("Address $" + addr2hex(regPC) + " - unknown opcode");
        codeRunning = false;
      }
    };

    function stackPush(value) {
      memory.set((regSP & 0xff) + 0x100, value & 0xff);
      regSP--;
      if (regSP < 0) {
        regSP &= 0xff;
        message("6502 Stack filled! Wrapping...");
      }
    }

    function stackPop() {
      var value;
      regSP++;
      if (regSP >= 0x100) {
        regSP &= 0xff;
        message("6502 Stack emptied! Wrapping...");
      }
      value = memory.get(regSP + 0x100);
      return value;
    }

    // Pops a byte
    function popByte() {
      return(memory.get(regPC++) & 0xff);
    }

    // Pops a little-endian word
    function popWord() {
      return popByte() + (popByte() << 8);
    }

    // Executes the assembled code
    function runBinary() {
      if (codeRunning) {
        // Switch OFF everything
        stop();
        ui.stop();
      } else {
        ui.play();
        codeRunning = true;
        executeId = setInterval(multiExecute, 15);
      }
    }

    function multiExecute() {
      if (!debug) {
        // use a prime number of iterations to avoid aliasing effects

        for (var w = 0; w < 97; w++) {
          execute();
        }
      }
      updateDebugInfo();
    }


    function executeNextInstruction() {
      var instructionName = popByte().toString(16).toLowerCase();
      if (instructionName.length === 1) {
        instructionName = '0' + instructionName;
      }
      var instruction = instructions['i' + instructionName];

      if (instruction) {
        instruction();
      } else {
        instructions.ierr();
      }
    }

    // Executes one instruction. This is the main part of the CPU simulator.
    function execute(debugging) {
      if (!codeRunning && !debugging) { return; }

      setRandomByte();
      executeNextInstruction();

      if ((regPC === 0) || (!codeRunning && !debugging)) {
        stop();
        message("Program end at PC=$" + addr2hex(regPC - 1));
        ui.stop();
      }
    }

    function setRandomByte() {
      memory.set(0xfe, Math.floor(Math.random() * 256));
    }

    function updateMonitor() {
      if (monitoring) {
        var start = parseInt($node.find('.start').val(), 16);
        var length = parseInt($node.find('.length').val(), 16);

        var monitorNode = $node.find('.monitor code');

        if (!isNaN(start) && !isNaN(length) && start >= 0 && length > 0 && (start + length) <= 0x10000) {
          monitorNode.html(memory.format(start, length));
        } else {
          monitorNode.html('Cannot monitor this range. Valid ranges are between $0000 and $ffff, inclusive.');
        }
      }
    }

    function handleMonitorRangeChange() {

      var $start  = $node.find('.start'),
          $length = $node.find('.length'),
          start   = parseInt($start.val(), 16),
          length  = parseInt($length.val(), 16);

      $start.removeClass('monitor-invalid');
      $length.removeClass('monitor-invalid');

      if(isNaN(start) || start < 0 || start > 0xffff) {

        $start.addClass('monitor-invalid');

      } else if(isNaN(length) || (start + length) > 0x10000) {

        $length.addClass('monitor-invalid');
      }
    }

    // Execute one instruction and print values
    function debugExec() {
      //if (codeRunning) {
        execute(true);
      //}
      updateDebugInfo();
    }

    function updateDebugInfo() {
      var html = "A=$" + num2hex(regA) + " X=$" + num2hex(regX) + " Y=$" + num2hex(regY) + "<br />";
      html += "SP=$" + num2hex(regSP) + " PC=$" + addr2hex(regPC);
      html += "<br />";
      html += "NV-BDIZC<br />";
      for (var i = 7; i >=0; i--) {
        html += regP >> i & 1;
      }
      $node.find('.minidebugger').html(html);
      updateMonitor();
    }

    // gotoAddr() - Set PC to address (or address of label)
    function gotoAddr() {
      var inp = prompt("Enter address or label", "");
      var addr = 0;
      if (labels.find(inp)) {
        addr = labels.getPC(inp);
      } else {
        if (inp.match(/^0x[0-9a-f]{1,4}$/i)) {
          inp = inp.replace(/^0x/, "");
          addr = parseInt(inp, 16);
        } else if (inp.match(/^\$[0-9a-f]{1,4}$/i)) {
          inp = inp.replace(/^\$/, "");
          addr = parseInt(inp, 16);
        }
      }
      if (addr === 0) {
        message("Unable to find/parse given address/label");
      } else {
        regPC = addr;
      }
      updateDebugInfo();
    }


    function stopDebugger() {
      debug = false;
    }

    function enableDebugger() {
      debug = true;
      if (codeRunning) {
        updateDebugInfo();
      }
    }

    // reset() - Reset CPU and memory.
    function reset() {
      display.reset();
      for (var i = 0; i < 0x600; i++) { // clear ZP, stack and screen
        memory.set(i, 0x00);
      }
      regA = regX = regY = 0;
      regPC = 0x600;
      regSP = 0xff;
      regP = 0x30;
      updateDebugInfo();
    }

    function stop() {
      codeRunning = false;
      clearInterval(executeId);
    }

    function toggleMonitor() {
      monitoring = !monitoring;
    }

    return {
      runBinary: runBinary,
      enableDebugger: enableDebugger,
      stopDebugger: stopDebugger,
      debugExec: debugExec,
      gotoAddr: gotoAddr,
      reset: reset,
      stop: stop,
      toggleMonitor: toggleMonitor,
      handleMonitorRangeChange: handleMonitorRangeChange
    };
  }


  function Labels() {
    var labelIndex = [];

    function indexLines(lines, symbols) {
      for (var i = 0; i < lines.length; i++) {
        if (!indexLine(lines[i], symbols)) {
          message("**Label already defined at line " + (i + 1) + ":** " + lines[i]);
          return false;
        }
      }
      return true;
    }

    // Extract label if line contains one and calculate position in memory.
    // Return false if label already exists.
    function indexLine(input, symbols) {
          
      // Figure out how many bytes this instruction takes
      var currentPC = assembler.getCurrentPC();
      assembler.assembleLine(input, 0, symbols); //TODO: find a better way for Labels to have access to assembler

      // Find command or label
      if (input.match(/^\w+:/)) {
        var label = input.replace(/(^\w+):.*$/, "$1");
        
        if (symbols.lookup(label)) {
          message("**Label " + label + "is already used as a symbol; please rename one of them**");
          return false;
        }
        
        return push(label + "|" + currentPC);
      }
      return true;
    }

    // Push label to array. Return false if label already exists.
    function push(name) {
      if (find(name)) {
        return false;
      }
      labelIndex.push(name + "|");
      return true;
    }

    // Returns true if label exists.
    function find(name) {
      var nameAndAddr;
      for (var i = 0; i < labelIndex.length; i++) {
        nameAndAddr = labelIndex[i].split("|");
        if (name === nameAndAddr[0]) {
          return true;
        }
      }
      return false;
    }

    // Associates label with address
    function setPC(name, addr) {
      var nameAndAddr;
      for (var i = 0; i < labelIndex.length; i++) {
        nameAndAddr = labelIndex[i].split("|");
        if (name === nameAndAddr[0]) {
          labelIndex[i] = name + "|" + addr;
          return true;
        }
      }
      return false;
    }

    // Get address associated with label
    function getPC(name) {
      var nameAndAddr;
      for (var i = 0; i < labelIndex.length; i++) {
        nameAndAddr = labelIndex[i].split("|");
        if (name === nameAndAddr[0]) {
          return (nameAndAddr[1]);
        }
      }
      return -1;
    }

    function displayMessage() {
      var str = "Found " + labelIndex.length + " label";
      if (labelIndex.length !== 1) {
        str += "s";
      }
      message(str + ".");
    }

    function reset() {
      labelIndex = [];
    }

    return {
      indexLines: indexLines,
      find: find,
      getPC: getPC,
      displayMessage: displayMessage,
      reset: reset
    };
  }


  function Assembler() {
    var defaultCodePC;
    var codeLen;
    var codeAssembledOK = false;

    var Opcodes = [
      /* Name, Imm,  ZP,   ZPX,  ZPY,  ABS, ABSX, ABSY,  IND, INDX, INDY, SNGL, BRA */
      ["ADC", 0x69, 0x65, 0x75, null, 0x6d, 0x7d, 0x79, null, 0x61, 0x71, null, null],
      ["AND", 0x29, 0x25, 0x35, null, 0x2d, 0x3d, 0x39, null, 0x21, 0x31, null, null],
      ["ASL", null, 0x06, 0x16, null, 0x0e, 0x1e, null, null, null, null, 0x0a, null],
      ["BIT", null, 0x24, null, null, 0x2c, null, null, null, null, null, null, null],
      ["BPL", null, null, null, null, null, null, null, null, null, null, null, 0x10],
      ["BMI", null, null, null, null, null, null, null, null, null, null, null, 0x30],
      ["BVC", null, null, null, null, null, null, null, null, null, null, null, 0x50],
      ["BVS", null, null, null, null, null, null, null, null, null, null, null, 0x70],
      ["BCC", null, null, null, null, null, null, null, null, null, null, null, 0x90],
      ["BCS", null, null, null, null, null, null, null, null, null, null, null, 0xb0],
      ["BNE", null, null, null, null, null, null, null, null, null, null, null, 0xd0],
      ["BEQ", null, null, null, null, null, null, null, null, null, null, null, 0xf0],
      ["BRK", null, null, null, null, null, null, null, null, null, null, 0x00, null],
      ["CMP", 0xc9, 0xc5, 0xd5, null, 0xcd, 0xdd, 0xd9, null, 0xc1, 0xd1, null, null],
      ["CPX", 0xe0, 0xe4, null, null, 0xec, null, null, null, null, null, null, null],
      ["CPY", 0xc0, 0xc4, null, null, 0xcc, null, null, null, null, null, null, null],
      ["DEC", null, 0xc6, 0xd6, null, 0xce, 0xde, null, null, null, null, null, null],
      ["EOR", 0x49, 0x45, 0x55, null, 0x4d, 0x5d, 0x59, null, 0x41, 0x51, null, null],
      ["CLC", null, null, null, null, null, null, null, null, null, null, 0x18, null],
      ["SEC", null, null, null, null, null, null, null, null, null, null, 0x38, null],
      ["CLI", null, null, null, null, null, null, null, null, null, null, 0x58, null],
      ["SEI", null, null, null, null, null, null, null, null, null, null, 0x78, null],
      ["CLV", null, null, null, null, null, null, null, null, null, null, 0xb8, null],
      ["CLD", null, null, null, null, null, null, null, null, null, null, 0xd8, null],
      ["SED", null, null, null, null, null, null, null, null, null, null, 0xf8, null],
      ["INC", null, 0xe6, 0xf6, null, 0xee, 0xfe, null, null, null, null, null, null],
      ["JMP", null, null, null, null, 0x4c, null, null, 0x6c, null, null, null, null],
      ["JSR", null, null, null, null, 0x20, null, null, null, null, null, null, null],
      ["LDA", 0xa9, 0xa5, 0xb5, null, 0xad, 0xbd, 0xb9, null, 0xa1, 0xb1, null, null],
      ["LDX", 0xa2, 0xa6, null, 0xb6, 0xae, null, 0xbe, null, null, null, null, null],
      ["LDY", 0xa0, 0xa4, 0xb4, null, 0xac, 0xbc, null, null, null, null, null, null],
      ["LSR", null, 0x46, 0x56, null, 0x4e, 0x5e, null, null, null, null, 0x4a, null],
      ["NOP", null, null, null, null, null, null, null, null, null, null, 0xea, null],
      ["ORA", 0x09, 0x05, 0x15, null, 0x0d, 0x1d, 0x19, null, 0x01, 0x11, null, null],
      ["TAX", null, null, null, null, null, null, null, null, null, null, 0xaa, null],
      ["TXA", null, null, null, null, null, null, null, null, null, null, 0x8a, null],
      ["DEX", null, null, null, null, null, null, null, null, null, null, 0xca, null],
      ["INX", null, null, null, null, null, null, null, null, null, null, 0xe8, null],
      ["TAY", null, null, null, null, null, null, null, null, null, null, 0xa8, null],
      ["TYA", null, null, null, null, null, null, null, null, null, null, 0x98, null],
      ["DEY", null, null, null, null, null, null, null, null, null, null, 0x88, null],
      ["INY", null, null, null, null, null, null, null, null, null, null, 0xc8, null],
      ["ROR", null, 0x66, 0x76, null, 0x6e, 0x7e, null, null, null, null, 0x6a, null],
      ["ROL", null, 0x26, 0x36, null, 0x2e, 0x3e, null, null, null, null, 0x2a, null],
      ["RTI", null, null, null, null, null, null, null, null, null, null, 0x40, null],
      ["RTS", null, null, null, null, null, null, null, null, null, null, 0x60, null],
      ["SBC", 0xe9, 0xe5, 0xf5, null, 0xed, 0xfd, 0xf9, null, 0xe1, 0xf1, null, null],
      ["STA", null, 0x85, 0x95, null, 0x8d, 0x9d, 0x99, null, 0x81, 0x91, null, null],
      ["TXS", null, null, null, null, null, null, null, null, null, null, 0x9a, null],
      ["TSX", null, null, null, null, null, null, null, null, null, null, 0xba, null],
      ["PHA", null, null, null, null, null, null, null, null, null, null, 0x48, null],
      ["PLA", null, null, null, null, null, null, null, null, null, null, 0x68, null],
      ["PHP", null, null, null, null, null, null, null, null, null, null, 0x08, null],
      ["PLP", null, null, null, null, null, null, null, null, null, null, 0x28, null],
      ["STX", null, 0x86, null, 0x96, 0x8e, null, null, null, null, null, null, null],
      ["STY", null, 0x84, 0x94, null, 0x8c, null, null, null, null, null, null, null],
      ["---", null, null, null, null, null, null, null, null, null, null, null, null]
    ];
    
    // Assembles the code into memory
    function assembleCode() {
      var BOOTSTRAP_ADDRESS = 0x600;
  
      simulator.reset();
      labels.reset();
      defaultCodePC = BOOTSTRAP_ADDRESS;
      $node.find('.messages code').empty();

      var code = $node.find('.code').val();
      code += "\n\n";
      var lines = code.split("\n");
      codeAssembledOK = true;

      message("Preprocessing ...");
      var symbols = preprocess(lines);

      message("Indexing labels ...");
      defaultCodePC = BOOTSTRAP_ADDRESS;
      if (!labels.indexLines(lines, symbols)) {
        return false;
      }
      labels.displayMessage();

      defaultCodePC = BOOTSTRAP_ADDRESS;
      message("Assembling code ...");
      
      codeLen = 0;
      for (var i = 0; i < lines.length; i++) {
        if (!assembleLine(lines[i], i, symbols)) {
          codeAssembledOK = false;
          break;
        }
      }

      if (codeLen === 0) {
        codeAssembledOK = false;
        message("No code to run.");
      }

      if (codeAssembledOK) {
        ui.assembleSuccess();
        memory.set(defaultCodePC, 0x00); //set a null byte at the end of the code
      } else {
        var str = lines[i].replace("<", "&lt;").replace(">", "&gt;");
        message("**Syntax error line " + (i + 1) + ": " + str + "**");
        ui.initialize();
        return false;
      }

      message("Code assembled successfully, " + codeLen + " bytes.");
      return true;
    }

    // Sanitize input: remove comments and trim leading/trailing whitespace
    function sanitize(line) {
      // remove comments
      var no_comments = line.replace(/^(.*?);.*/, "$1");
  
      // trim line
      return no_comments.replace(/^\s+/, "").replace(/\s+$/, "");
    }

    function preprocess(lines) {
      var table = [];
      var PREFIX = "__"; // Using a prefix avoids clobbering any predefined properties
      
      function lookup(key) {
        if (table.hasOwnProperty(PREFIX + key)) return table[PREFIX + key];
        else return undefined;
      }
      
      function add(key, value) {
        var valueAlreadyExists = table.hasOwnProperty(PREFIX + key)
        if (!valueAlreadyExists) {
          table[PREFIX + key] = value;
        }
      }
        
      // Build the substitution table
      for (var i = 0; i < lines.length; i++) {
        lines[i] = sanitize(lines[i]);
        var match_data = lines[i].match(/^define\s+(\w+)\s+(\S+)/);
        if (match_data) {
          add(match_data[1], sanitize(match_data[2]));
          lines[i] = ""; // We're done with this preprocessor directive, so delete it
        }
      }
      
      // Callers will only need the lookup function
      return {
        lookup: lookup
      }
    }
  
    // Assembles one line of code.
    // Returns true if it assembled successfully, false otherwise.
    function assembleLine(input, lineno, symbols) {
      var label, command, param, addr;

      // Find command or label
      if (input.match(/^\w+:/)) {
        label = input.replace(/(^\w+):.*$/, "$1");
        if (input.match(/^\w+:[\s]*\w+.*$/)) {
          input = input.replace(/^\w+:[\s]*(.*)$/, "$1");
          command = input.replace(/^(\w+).*$/, "$1");
        } else {
          command = "";
        }
      } else {
        command = input.replace(/^(\w+).*$/, "$1");
      }

      // Nothing to do for blank lines
      if (command === "") {
        return true;
      }

      command = command.toUpperCase();

      if (input.match(/^\*\s*=\s*\$?[0-9a-f]*$/)) {
        // equ spotted
        param = input.replace(/^\s*\*\s*=\s*/, "");
        if (param[0] === "$") {
          param = param.replace(/^\$/, "");
          addr = parseInt(param, 16);
        } else {
          addr = parseInt(param, 10);
        }
        if ((addr < 0) || (addr > 0xffff)) {
          message("Unable to relocate code outside 64k memory");
          return false;
        }
        defaultCodePC = addr;
        return true;
      }

      if (input.match(/^\w+\s+.*?$/)) {
        param = input.replace(/^\w+\s+(.*?)/, "$1");
      } else if (input.match(/^\w+$/)) {
        param = "";
      } else {
        return false;
      }

      param = param.replace(/[ ]/g, "");

      if (command === "DCB") {
        return DCB(param);
      }
      for (var o = 0; o < Opcodes.length; o++) {
        if (Opcodes[o][0] === command) {
          if (checkSingle(param, Opcodes[o][11])) { return true; }
          if (checkImmediate(param, Opcodes[o][1], symbols)) { return true; }
          if (checkZeroPage(param, Opcodes[o][2], symbols)) { return true; }
          if (checkZeroPageX(param, Opcodes[o][3], symbols)) { return true; }
          if (checkZeroPageY(param, Opcodes[o][4], symbols)) { return true; }
          if (checkAbsoluteX(param, Opcodes[o][6], symbols)) { return true; }
          if (checkAbsoluteY(param, Opcodes[o][7], symbols)) { return true; }
          if (checkIndirect(param, Opcodes[o][8], symbols)) { return true; }
          if (checkIndirectX(param, Opcodes[o][9], symbols)) { return true; }
          if (checkIndirectY(param, Opcodes[o][10], symbols)) { return true; }
          if (checkAbsolute(param, Opcodes[o][5], symbols)) { return true; }
          if (checkBranch(param, Opcodes[o][12])) { return true; }
        }
      }
      
      return false; // Unknown syntax
    }

    function DCB(param) {
      var values, number, str, ch;
      values = param.split(",");
      if (values.length === 0) { return false; }
      for (var v = 0; v < values.length; v++) {
        str = values[v];
        if (str) {
          ch = str.substring(0, 1);
          if (ch === "$") {
            number = parseInt(str.replace(/^\$/, ""), 16);
            pushByte(number);
          } else if (ch >= "0" && ch <= "9") {
            number = parseInt(str, 10);
            pushByte(number);
          } else {
            return false;
          }
        }
      }
      return true;
    }
    
    // Try to parse the given parameter as a byte operand.
    // Returns the (positive) value if successful, otherwise -1
    function tryParseByteOperand(param, symbols) {
      if (param.match(/^\w+$/)) {
        var lookupVal = symbols.lookup(param); // Substitute symbol by actual value, then proceed
        if (lookupVal) {
          param = lookupVal;
        }
      }
      
      var value;
    
      // Is it a hexadecimal operand?
      var match_data = param.match(/^\$([0-9a-f]{1,2})$/i);
      if (match_data) {
        value = parseInt(match_data[1], 16);
      } else {
        // Is it a decimal operand?
        match_data = param.match(/^([0-9]{1,3})$/i);
        if (match_data) {
          value = parseInt(match_data[1], 10);
        }
      }
      
      // Validate range
      if (value >= 0 && value <= 0xff) {
        return value;
      } else {
        return -1;  
      }
    }
    
    // Try to parse the given parameter as a word operand.
    // Returns the (positive) value if successful, otherwise -1
    function tryParseWordOperand(param, symbols) {
      if (param.match(/^\w+$/)) {
        var lookupVal = symbols.lookup(param); // Substitute symbol by actual value, then proceed
        if (lookupVal) {
          param = lookupVal;
        }
      }
      
      var value;
    
      // Is it a hexadecimal operand?
      var match_data = param.match(/^\$([0-9a-f]{3,4})$/i);
      if (match_data) {
        value = parseInt(match_data[1], 16);
      } else {
        // Is it a decimal operand?
        match_data = param.match(/^([0-9]{1,5})$/i);
        if (match_data) {
          value = parseInt(match_data[1], 10);
        }
      }
      
      // Validate range
      if (value >= 0 && value <= 0xffff) {
        return value;
      } else {
        return -1;
      }
    }

    // Common branch function for all branches (BCC, BCS, BEQ, BNE..)
    function checkBranch(param, opcode) {
      var addr;
      if (opcode === null) { return false; }

      addr = -1;
      if (param.match(/\w+/)) {
        addr = labels.getPC(param);
      }
      if (addr === -1) { pushWord(0x00); return false; }
      pushByte(opcode);
      if (addr < (defaultCodePC - 0x600)) {  // Backwards?
        pushByte((0xff - ((defaultCodePC - 0x600) - addr)) & 0xff);
        return true;
      }
      pushByte((addr - (defaultCodePC - 0x600) - 1) & 0xff);
      return true;
    }

    // Check if param is immediate and push value
    function checkImmediate(param, opcode, symbols) {
      var value, label, hilo, addr;
      if (opcode === null) { return false; }
      
      var match_data = param.match(/^#([\w\$]+)$/i);
      if (match_data) {
        var operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }
      
      // Label lo/hi
      if (param.match(/^#[<>]\w+$/)) {
        label = param.replace(/^#[<>](\w+)$/, "$1");
        hilo = param.replace(/^#([<>]).*$/, "$1");
        pushByte(opcode);
        if (labels.find(label)) {
          addr = labels.getPC(label);
          switch(hilo) {
          case ">":
            pushByte((addr >> 8) & 0xff);
            return true;
          case "<":
            pushByte(addr & 0xff);
            return true;
          default:
            return false;
          }
        } else {
          pushByte(0x00);
          return true;
        }
      }
      
      return false;
    }

    // Check if param is indirect and push value
    function checkIndirect(param, opcode, symbols) {
      var value;
      if (opcode === null) { return false; }
      
      var match_data = param.match(/^\(([\w\$]+)\)$/i);
      if (match_data) {
        var operand = tryParseWordOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushWord(operand);
          return true;
        }
      }
      return false;
    }

    // Check if param is indirect X and push value
    function checkIndirectX(param, opcode, symbols) {
      var value;
      if (opcode === null) { return false; }
      
      var match_data = param.match(/^\(([\w\$]+),X\)$/i);
      if (match_data) {
        var operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }
      return false;
    }

    // Check if param is indirect Y and push value
    function checkIndirectY(param, opcode, symbols) {
      var value;
      if (opcode === null) { return false; }
      
      var match_data = param.match(/^\(([\w\$]+)\),Y$/i);
      if (match_data) {
        var operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }
      return false;
    }

    // Check single-byte opcodes
    function checkSingle(param, opcode) {
      if (opcode === null) { return false; }
      // Accumulator instructions are counted as single-byte opcodes
      if (param !== "" && param !== "A") { return false; }
      pushByte(opcode);
      return true;
    }

    // Check if param is ZP and push value
    function checkZeroPage(param, opcode, symbols) {
      var value;
      if (opcode === null) { return false; }

      var operand = tryParseByteOperand(param, symbols);
      if (operand >= 0) {
        pushByte(opcode);
        pushByte(operand);
        return true;
      }
      
      return false;
    }

    // Check if param is ABSX and push value
    function checkAbsoluteX(param, opcode, symbols) {
      var number, value, addr;
      if (opcode === null) { return false; }
      
      var match_data = param.match(/^([\w\$]+),X$/i);
      if (match_data) {
        var operand = tryParseWordOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushWord(operand);
          return true;
        }
      }

      // it could be a label too..
      if (param.match(/^\w+,X$/i)) {
        param = param.replace(/,X$/i, "");
        pushByte(opcode);
        if (labels.find(param)) {
          addr = labels.getPC(param);
          if (addr < 0 || addr > 0xffff) { return false; }
          pushWord(addr);
          return true;
        } else {
          pushWord(0xffff); // filler, only used while indexing labels
          return true;
        }
      }

      return false;
    }

    // Check if param is ABSY and push value
    function checkAbsoluteY(param, opcode, symbols) {
      var number, value, addr;
      if (opcode === null) { return false; }
      
      var match_data = param.match(/^([\w\$]+),Y$/i);
      if (match_data) {
        var operand = tryParseWordOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushWord(operand);
          return true;
        }
      }

      // it could be a label too..
      if (param.match(/^\w+,Y$/i)) {
        param = param.replace(/,Y$/i, "");
        pushByte(opcode);
        if (labels.find(param)) {
          addr = labels.getPC(param);
          if (addr < 0 || addr > 0xffff) { return false; }
          pushWord(addr);
          return true;
        } else {
          pushWord(0xffff); // filler, only used while indexing labels
          return true;
        }
      }
      return false;
    }

    // Check if param is ZPX and push value
    function checkZeroPageX(param, opcode, symbols) {
      var number, value;
      if (opcode === null) { return false; }
      
      var match_data = param.match(/^([\w\$]+),X$/i);
      if (match_data) {
        var operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }
      
      return false;
    }

    // Check if param is ZPY and push value
    function checkZeroPageY(param, opcode, symbols) {
      var number, value;
      if (opcode === null) { return false; }
      
      var match_data = param.match(/^([\w\$]+),Y$/i);
      if (match_data) {
        var operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }
      
      return false;
    }

    // Check if param is ABS and push value
    function checkAbsolute(param, opcode, symbols) {
      var value, number, addr;
      if (opcode === null) { return false; }

      var match_data = param.match(/^([\w\$]+)$/i);
      if (match_data) {
        var operand = tryParseWordOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushWord(operand);
          return true;
        }
      }

      // it could be a label too..
      if (param.match(/^\w+$/)) {
        pushByte(opcode);
        if (labels.find(param)) {
          addr = (labels.getPC(param));
          if (addr < 0 || addr > 0xffff) { return false; }
          pushWord(addr);
          return true;
        } else {
          pushWord(0xffff); // filler, only used while indexing labels
          return true;
        }
      }
      return false;
    }

    // Push a byte to memory
    function pushByte(value) {
      memory.set(defaultCodePC, value & 0xff);
      defaultCodePC++;
      codeLen++;
    }

    // Push a word to memory in little-endian order
    function pushWord(value) {
      pushByte(value & 0xff);
      pushByte((value >> 8) & 0xff);
    }

    function openPopup(content, title) {
      var w = window.open('', title, 'width=500,height=300,resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no,status=no');

      var html = "<html><head>";
      html += "<link href='style.css' rel='stylesheet' type='text/css' />";
      html += "<title>" + title + "</title></head><body>";
      html += "<pre><code>";

      html += content;

      html += "</code></pre></body></html>";
      w.document.write(html);
      w.document.close();
    }

    // Dump binary as hex to new window
    function hexdump() {
      openPopup(memory.format(0x600, codeLen), 'Hexdump');
    }

    // TODO: Create separate disassembler object?
    var addressingModes = [
      null,
      'Imm',
      'ZP',
      'ZPX',
      'ZPY',
      'ABS',
      'ABSX',
      'ABSY',
      'IND',
      'INDX',
      'INDY',
      'SNGL',
      'BRA'
    ];

    var instructionLength = {
      Imm: 2,
      ZP: 2,
      ZPX: 2,
      ZPY: 2,
      ABS: 3,
      ABSX: 3,
      ABSY: 3,
      IND: 3,
      INDX: 2,
      INDY: 2,
      SNGL: 1,
      BRA: 2
    };

    function getModeAndCode(byte) {
      var index;
      var line = Opcodes.filter(function (line) {
        var possibleIndex = line.indexOf(byte);
        if (possibleIndex > -1) {
          index = possibleIndex;
          return true;
        }
      })[0];

      if (!line) { //instruction not found
        return {
          opCode: '???',
          mode: 'SNGL'
        };
      } else {
        return {
          opCode: line[0],
          mode: addressingModes[index]
        };
      }
    }

    function createInstruction(address) {
      var bytes = [];
      var opCode;
      var args = [];
      var mode;

      function isAccumulatorInstruction() {
        var accumulatorBytes = [0x0a, 0x4a, 0x2a, 0x6a];
        if (accumulatorBytes.indexOf(bytes[0]) > -1) {
          return true;
        }
      }

      function isBranchInstruction() {
        return opCode.match(/^B/) && !(opCode == 'BIT' || opCode == 'BRK');
      }

      //This is gnarly, but unavoidably so?
      function formatArguments() {
        var argsString = args.map(num2hex).reverse().join('');

        if (isBranchInstruction()) {
          var destination = address + 2;
          if (args[0] > 0x7f) {
            destination -= 0x100 - args[0];
          } else {
            destination += args[0];
          }
          argsString = addr2hex(destination);
        }

        if (argsString) {
          argsString = '$' + argsString;
        }
        if (mode == 'Imm') {
          argsString = '#' + argsString;
        }
        if (mode.match(/X$/)) {
          argsString += ',X';
        }
        if (mode.match(/^IND/)) {
          argsString = '(' + argsString + ')';
        }
        if (mode.match(/Y$/)) {
          argsString += ',Y';
        }

        if (isAccumulatorInstruction()) {
          argsString = 'A';
        }

        return argsString;
      }

      return {
        addByte: function (byte) {
          bytes.push(byte);
        },
        setModeAndCode: function (modeAndCode) {
          opCode = modeAndCode.opCode;
          mode = modeAndCode.mode;
        },
        addArg: function (arg) {
          args.push(arg);
        },
        toString: function () {
          var bytesString = bytes.map(num2hex).join(' ');
          var padding = Array(11 - bytesString.length).join(' ');
          return '$' + addr2hex(address) + '    ' + bytesString + padding + opCode +
            ' ' + formatArguments(args);
        }
      };
    }

    function disassemble() {
      var startAddress = 0x600;
      var currentAddress = startAddress;
      var endAddress = startAddress + codeLen;
      var instructions = [];
      var length;
      var inst;
      var byte;
      var modeAndCode;

      while (currentAddress < endAddress) {
        inst = createInstruction(currentAddress);
        byte = memory.get(currentAddress);
        inst.addByte(byte);

        modeAndCode = getModeAndCode(byte);
        length = instructionLength[modeAndCode.mode];
        inst.setModeAndCode(modeAndCode);

        for (var i = 1; i < length; i++) {
          currentAddress++;
          byte = memory.get(currentAddress);
          inst.addByte(byte);
          inst.addArg(byte);
        }
        instructions.push(inst);
        currentAddress++;
      }

      var html = 'Address  Hexdump   Dissassembly\n';
      html +=    '-------------------------------\n';
      html += instructions.join('\n');
      openPopup(html, 'Disassembly');
    }

    return {
      assembleLine: assembleLine,
      assembleCode: assembleCode,
      getCurrentPC: function () {
        return defaultCodePC;
      },
      hexdump: hexdump,
      disassemble: disassemble
    };
  }


  function addr2hex(addr) {
    return num2hex((addr >> 8) & 0xff) + num2hex(addr & 0xff);
  }

  function num2hex(nr) {
    var str = "0123456789abcdef";
    var hi = ((nr & 0xf0) >> 4);
    var lo = (nr & 15);
    return str.substring(hi, hi + 1) + str.substring(lo, lo + 1);
  }

  // Prints text in the message window
  function message(text) {
    $node.find('.messages code').append(text + '\n').scrollTop(10000);
  }

  initialize();
}

$(document).ready(function () {
  $('.widget').each(function () {
    SimulatorWidget(this);
  });
});
