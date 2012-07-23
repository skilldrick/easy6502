---
layout: basic
---

<h2>Snake6502</h2>
{% include start.html %}

  jsr init
  jsr loop

init:
  jsr loadrandompixel
  rts

loop:
  jsr loadrandompixel
  ldy #0
  lda #$00
  ;sta ($02),y ;clear previous pixel
  lda $fe
  sta ($00),y
  jmp loop

loadrandompixel:
  ;move $00 and $01 to $02 and $03
  lda $00
  sta $02
  lda $01
  sta $03

  ;load a new random byte into $00
  lda $fe
  sta $00

  ;load a new random number from 2 to 5 into $01
  lda $fe
  and #$3
  adc #$2
  sta $01

  rts

background:
  dcb $0

foreground:
  dcb $1


{% include end.html %}
