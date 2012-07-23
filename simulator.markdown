---
layout: basic
---

<h2>Simulator</h2>

To use the disassembler, click **Assemble**, then **Disassemble**. [Back to Easy 6502](index.html).

{% include start.html %}
start:
  jsr init

loop:
  jsr drawMap
  jsr genMap
  jsr testMemory
  jmp loop

testMemory:
  lda #0
  ldx $10    ;$10 is the previous value of $80
  sta $500,x
  lda #1
  ldx $80
  sta $500,x
  stx $10

  lda #0
  ldx $11    ;$11 is the previous value of $81
  sta $520,x
  lda #1
  ldx $81
  sta $520,x
  stx $11

  lda #0
  ldx $12    ;$12 is the previous value of $85
  sta $540,x
  lda #1
  ldx $85
  sta $540,x
  stx $12

  lda #0
  ldx $13    ;$13 is the previous value of $89
  sta $560,x
  lda #1
  ldx $89
  sta $560,x
  stx $13

  rts

init:
  lda #10
  sta $60
  sta $61

  ldx #0
  lda walls

;draw exactly 256 pixels of wall at top and bottom
drawinitialwalls:
  sta $200,x ;draw the top bit of wall
  sta $400,x ;draw the bottom bit of wall
  dex        ;count down from 0
  cpx #0     ;until we hit 0
  bne drawinitialwalls

  lda #$10
  sta $80  ; origin
  ldx #$0f

;fill $81-$90 with $10
set:
  sta $81,x  ; target
  dex
  bpl set
  rts

;--

drawMap:
  lda #$00
  sta $78
  lda #$20
  sta $79
  lda #$c0
  sta $7a
  lda #$e0
  sta $7b

  ldx #$0f
drawLoop:
  lda $81,x
  sta $82,x

  tay
  sty $02
  lda ypos,y
  sta $00
  iny
  lda ypos,y
  sta $01

  lda walls
  ldy $78
  sta ($00),y
  iny
  sta ($00),y

  ldy $7b
  sta ($00),y
  iny
  sta ($00),y

  ldy $79
  lda #0
  sta ($00),y
  iny
  sta ($00),y

  ldy $7a
  sta ($00),y
  iny
  sta ($00),y

  inc $78
  inc $79
  inc $7a
  inc $7b
  inc $78
  inc $79
  inc $7a
  inc $7b
  dex
  bpl drawLoop
  LDX #$1
  STX $91
  rts

;---

genMap:
  lda $80
  cmp $81
  beq done
  lda $80
  clc
  sbc $81
  bpl plus
  bmi minus
done:
  lda $fe
  and #$f
  asl
  sta $80
  rts
minus:
  dec $81
  dec $81
  rts
plus:
  inc $81
  inc $81
  rts

ypos:
  dcb $00,$02,$20,$02,$40,$02,$60,$02
  dcb $80,$02,$a0,$02,$c0,$02,$e0,$02
  dcb $00,$03,$20,$03,$40,$03,$60,$03
  dcb $80,$03,$a0,$03,$c0,$03,$e0,$03
  dcb $00,$04,$20,$04,$40,$04,$60,$04
  dcb $80,$04,$a0,$04,$c0,$04,$e0,$04
  dcb $00,$05,$20,$05,$40,$05,$60,$05
  dcb $80,$05,$a0,$05,$c0,$05,$e0,$05

walls:
  dcb $d

shipcolour:
  dcb $4
{% include end.html %}
