---
layout: basic
---

<h2>Snake6502</h2>
{% include start.html %}

; Change direction: W A S D

; $00-01 => screen location of random pixel
; $10-11 => screen location of snake head
; $12-?? => snake body (in byte pairs)
; $02    => direction (1 => up, 2 => right, 4 => down, 8 => left)
; $03    => snake length

  jsr init
  jsr loop

init:
  ;jsr loadrandompixel
  jsr initsnake
  rts

initsnake:
  lda #2  ;start direction
  sta $02
  lda #4  ;start length
  sta $03
  lda #$11
  sta $10
  lda #$10
  sta $12
  lda #$0f
  sta $14
  lda #$04
  sta $11
  sta $13
  sta $15

loop:
  jsr readkeys
  jsr updatesnake
  jsr drawsnake
  ;jsr drawrandompixel
  jsr spinwheels
  jmp loop

spinwheels:
  ldx #0
spinloop:
  nop
  nop
  dex
  bne spinloop
  rts

;Need to draw the whole snake body here
;Only draw head and erase tail each time
;Tail is head pointer + length
drawsnake:
  ldy #0
  lda foreground
  sta ($10),y
  lda $03
  tax
  lda background
  sta ($10,x)
  rts

updatesnake:
  lda $03 ;location of length
  tax
  dex ;last pair index is length - 1
  txa
  clc
  adc #2
  tay
updateloop:
  lda $10,x
  sta $0010,y
  dex
  dey
  cpy #1
  bne updateloop

  lda #1
  bit $02
  bne up
  lda #2
  bit $02
  bne right
  lda #4
  bit $02
  bne down
  lda #8
  bit $02
  bne left
up:
  lda $10
  sec
  sbc #$20
  sta $10
  bcc upup
  rts
upup:
  dec $11
  lda #$1
  cmp $11
  beq collision
  rts
right:
  inc $10
  lda #$1f
  bit $10
  beq collision
  rts
down:
  lda $10
  clc
  adc #$20
  sta $10
  bcs downdown
  rts
downdown:
  inc $11
  lda #$6
  cmp $11
  beq collision
  rts
left:
  dec $10
  lda $10
  and #$1f
  cmp #$1f
  beq collision
  rts
collision:
  jmp gameover

readkeys:
  lda $ff
  cmp #$77
  beq upkey
  cmp #$64
  beq rightkey
  cmp #$73
  beq downkey
  cmp #$61
  beq leftkey
  rts
upkey:
  lda #1
  sta $02
  rts
rightkey:
  lda #2
  sta $02
  rts
downkey:
  lda #4
  sta $02
  rts
leftkey:
  lda #8
  sta $02
  rts

drawrandompixel:
  ldy #0
  lda background
  sta ($00),y ;clear previous pixel
  jsr loadrandompixel
  lda $fe
  sta ($00),y
  rts

loadrandompixel:
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

gameover:

{% include end.html %}
