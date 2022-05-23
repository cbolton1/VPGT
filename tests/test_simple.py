from MachineLearning.simpleLSTM import deltaToPath, readData
import pytest
import pandas as pd
import numpy as np

def testDeltaToPath():
    dtp = deltaToPath()
    deltas = pd.DataFrame(([
        [0.0, 0.0, 0.0,0.0, 0.0, 0.0],
    ]))
    start = np.ndarray([-117.9635382,33.97682,-118.44929,5.6,178.2,180.])
    output = pd.DataFrame([
        [-117.9635382,33.97682,-118.44929,5.6,178.2,180.],
    ])
    assert dtp(deltas, start) == output
